import * as THREE from 'three';
// import metaversefile from 'metaversefile';
// const {useApp, useFrame, useRenderer, useCamera, useMaterials, useCleanup} = metaversefile;
import {getRenderer, camera} from './renderer.js';
import {WebaverseShaderMaterial} from './materials.js';
import renderSettingsManager from './rendersettings-manager.js';
import metaversefile from 'metaversefile';

const resolution = 2048;
const worldSize = 10000;
const near = 0.1;

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
const localPlane = new THREE.Plane();

const _planeToVector4 = (plane, target) => {
  target.copy(plane.normal);
  target.w = plane.constant;
};

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 objectNormal = vec3(normal);
    vec3 transformedNormal = objectNormal;
    transformedNormal = normalMatrix * transformedNormal;
    transformedNormal = -transformedNormal; // due to THREE.BackSide, FLIP_SIDED
    vNormal = normalize(transformedNormal);

    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
		vWorldPosition = worldPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `\
  vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
    // dir can be either a direction vector or a normal vector
    // upper-left 3x3 of matrix is assumed to be orthogonal
    return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
  }

  //

  uniform samplerCube envMap;
  uniform vec4 plane;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float distanceToPoint(vec4 plane, vec3 point) {
    vec3 normal = plane.xyz;
    float constant = plane.w;
    return dot(normal, point) + constant;
  }
  void main() {
    vec3 normal = normalize(vNormal);
    const float flipEnvMap = 1.;
    // const float refractionRatio = 0.98;
    const float refractionRatio = 1.;

    vec3 cameraToFrag;
    cameraToFrag = normalize( vWorldPosition - cameraPosition );

    // Transforming Normal Vectors with the Inverse Transformation
    vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
    
    vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );

    vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
    gl_FragColor = envColor;

    float d = distanceToPoint(plane, cameraPosition);
    gl_FragColor.a = 1.0 - smoothstep(0.0, 20.0, d);
    if (gl_FragColor.a <= 0.0) {
      discard;
    }
  }
`;

class ScenePreviewer extends THREE.Object3D {
  constructor() {
    super();

    const previewScene = new THREE.Scene();
    previewScene.name = 'previewScene';
    previewScene.autoUpdate = false;
    this.previewScene = previewScene
    
    const previewContainer = new THREE.Object3D();
    previewContainer.name = 'previewContainer';
    this.previewContainer = previewContainer;
    this.previewScene.add(previewContainer);

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(
      resolution,
      {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        // magFilter: THREE.LinearMipmapLinearFilter,
      },
    );
    cubeRenderTarget.texture.mapping = THREE.CubeRefractionMapping;
    this.cubeRenderTarget = cubeRenderTarget;
    const cubeCamera = new THREE.CubeCamera(near, camera.far, cubeRenderTarget);
    this.cubeCamera = cubeCamera;

    const _makeSkyboxMesh = () => {
      const skyboxGeometry = new THREE.SphereGeometry(worldSize, 64, 32, 0, Math.PI);
      const skyboxMaterial = new WebaverseShaderMaterial({
        uniforms: {
          envMap: {
            value: cubeRenderTarget.texture,
            needsUpdate: true,
          },
          plane: {
            value: new THREE.Vector4(0, 0, 0, 0),
            needsUpdate: false,
          },
        },
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        transparent: true,
      });
      /* const skyboxMaterial = new THREE.MeshBasicMaterial({
        envMap: cubeRenderTarget.texture,
        side: THREE.BackSide,
      });
      skyboxMaterial.onBeforeCompile = function() {
        debugger;
      }; */
      const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
      skyboxMesh.onBeforeRender = () => {
        const position = localVector;
        const quaternion = localQuaternion;
        const scale = localVector2;
        skyboxMesh.matrixWorld.decompose(position, quaternion, scale);

        const normal = localVector3.set(0, 0, -1)
          .applyQuaternion(quaternion);
        localPlane.setFromNormalAndCoplanarPoint(normal, position);
        
        _planeToVector4(localPlane, skyboxMesh.material.uniforms.plane.value);
        skyboxMesh.material.uniforms.plane.needsUpdate = true;
      };
      return skyboxMesh;
    };
    this.skyboxMesh = _makeSkyboxMesh();
    this.sceneObject = new THREE.Object3D();

    this.scene = null;
    this.renderedScene = null;
    this.focused = false;
  }
  async loadScene(sceneUrl) {
    if (this.scene) {
      this.detachScene();
    }
    
    const popPreviewContainerTransform = !this.focused ? this.#pushPreviewContainerTransform() : null;
    this.scene = await metaversefile.createAppAsync({
      start_url: sceneUrl,
      components: {
        mode: 'detached',
        paused: !this.focused,
        objectComponents: [
          {
            key: 'physics',
            value: true,
          },
        ],
      },
      parent: this.previewContainer,
    });
    popPreviewContainerTransform && popPreviewContainerTransform();
    if (!this.focused) {
      this.render();
    }
  }
  attachScene(scene) {
    this.scene = scene;
    this.previewContainer.add(scene);

    this.render();
  }
  detachScene() {
    const {scene} = this;
    if (scene) {
      scene.parent.remove(scene);
      this.scene = null;
    }
    return scene;
  }
  setFocus(focus) {
    this.focused = focus;

    this.skyboxMesh.visible = !this.focused;
    if (this.focused) {
      this.sceneObject.add(this.previewContainer);
      this.skyboxMesh.visible = false;
    } else {
      this.previewScene.add(this.previewContainer);
      this.skyboxMesh.visible = true;
    }

    if (this.scene) {
      this.scene.setComponent('paused', !this.focused);
    }

    if (!this.focused) {
      this.render();
    }
  }
  #pushPreviewContainerTransform() {
    const oldPosition = localVector.copy(this.position);
    const oldQuaternion = localQuaternion.copy(this.quaternion);
    const oldScale = localVector2.copy(this.scale);
    const oldMatrix = localMatrix.copy(this.matrix);
    const oldMatrixWorld = localMatrix2.copy(this.matrixWorld);

    // set transforms
    this.previewContainer.position.copy(this.position);
    this.previewContainer.quaternion.copy(this.quaternion);
    this.previewContainer.scale.copy(this.scale);
    this.previewContainer.matrix.copy(this.matrix);
    this.previewContainer.matrixWorld.copy(this.matrixWorld);

    return () => {
      this.previewContainer.position.copy(oldPosition);
      this.previewContainer.quaternion.copy(oldQuaternion);
      this.previewContainer.scale.copy(oldScale);
      this.previewContainer.matrix.copy(oldMatrix);
      this.previewContainer.matrixWorld.copy(oldMatrixWorld);
    };
  }
  #pushRenderSettings() {
    if (this.scene) {
      const renderSettings = renderSettingsManager.findRenderSettings(this.previewScene);
      renderSettingsManager.applyRenderSettingsToScene(renderSettings, this.previewScene);
      
      return () => {
        renderSettingsManager.applyRenderSettingsToScene(null, this.previewScene);
      };
    } else {
      return () => {};
    }
  }
  render() {
    const renderer = getRenderer();

    // push old state
    const popPreviewContainerTransform = this.#pushPreviewContainerTransform();
    const popRenderSettings = this.#pushRenderSettings();

    this.cubeCamera.position.setFromMatrixPosition(this.skyboxMesh.matrixWorld);
    // this.cubeCamera.quaternion.setFromRotationMatrix(this.skyboxMesh.matrixWorld);
    this.cubeCamera.updateMatrixWorld();

    // render
    this.cubeRenderTarget.clear(renderer, true, true, true);
    this.cubeCamera.update(renderer, this.previewScene);
  
    // pop old state
    popPreviewContainerTransform();
    popRenderSettings();
  }
};
export {
  ScenePreviewer,
};