import * as THREE from 'three';

import metaversefile from 'metaversefile';
const {useApp, useFrame, useLocalPlayer, useCameraManager, useLoaders, useInternals} = metaversefile;
const baseUrl = import.meta.url.replace(/(\/)[^/\\]*$/, '$1');

export default () => {
  const app = useApp();
  const localPlayer = useLocalPlayer();
  const cameraManager = useCameraManager();
  const {renderer, camera} = useInternals();
  let narutoRunTime = 0;
  let lastStopSw = 0;
  const textureLoader = new THREE.TextureLoader();
  const wave2 = textureLoader.load(`${baseUrl}/textures/wave2.jpeg`);
  const wave20 = textureLoader.load(`${baseUrl}/textures/wave20.png`);
  const wave9 = textureLoader.load(`${baseUrl}/textures/wave9.png`);
  const textureR = textureLoader.load(`${baseUrl}/textures/r.jpg`);
  const textureG = textureLoader.load(`${baseUrl}/textures/g.jpg`);
  const textureB = textureLoader.load(`${baseUrl}/textures/b.jpg`);
  const electronicballTexture = textureLoader.load(`${baseUrl}/textures/electronic-ball2.png`);
  const noiseMap = textureLoader.load(`${baseUrl}/textures/noise.jpg`);

  let currentDir = new THREE.Vector3();
  // ################################################ trace narutoRun Time ########################################
  {
    const localVector = new THREE.Vector3();
    useFrame(() => {
      localVector.x = 0;
      localVector.y = 0;
      localVector.z = -1;
      currentDir = localVector.applyQuaternion(localPlayer.quaternion);
      currentDir.normalize();
      if (localPlayer.hasAction('narutoRun')) {
        narutoRunTime++;
        lastStopSw = 1;
      } else {
        narutoRunTime = 0;
      }
    });
  }

  // ##################################### front dust ################################################
  {
    const particleCount = 20;
    const group = new THREE.Group();
    const info = {
      velocity: [particleCount],
    };
    const acc = new THREE.Vector3(-0.000, 0.0008, 0.0018);

    // ##################################################### get Dust geometry #####################################################
    const identityQuaternion = new THREE.Quaternion();
    const _getDustGeometry = geometry => {
      // console.log(geometry)
      const geometry2 = new THREE.BufferGeometry();
      ['position', 'normal', 'uv'].forEach(k => {
        geometry2.setAttribute(k, geometry.attributes[k]);
      });
      geometry2.setIndex(geometry.index);

      const positions = new Float32Array(particleCount * 3);
      const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
      geometry2.setAttribute('positions', positionsAttribute);
      const quaternions = new Float32Array(particleCount * 4);
      for (let i = 0; i < particleCount; i++) {
        identityQuaternion.toArray(quaternions, i * 4);
      }
      const quaternionsAttribute = new THREE.InstancedBufferAttribute(quaternions, 4);
      geometry2.setAttribute('quaternions', quaternionsAttribute);

      const startTimes = new Float32Array(particleCount);
      const startTimesAttribute = new THREE.InstancedBufferAttribute(startTimes, 1);
      geometry2.setAttribute('startTimes', startTimesAttribute);

      const opacityAttribute = new THREE.InstancedBufferAttribute(new Float32Array(particleCount), 1);
      opacityAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry2.setAttribute('opacity', opacityAttribute);

      const brokenAttribute = new THREE.InstancedBufferAttribute(new Float32Array(particleCount), 1);
      brokenAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry2.setAttribute('broken', brokenAttribute);

      return geometry2;
    };

    // ##################################################### material #####################################################
    const dustMaterial = new THREE.MeshBasicMaterial({
      // clipping: false,
      fog: false,
      // lights: false,
    });
    dustMaterial.transparent = true;
    dustMaterial.depthWrite = false;
    dustMaterial.alphaMap = noiseMap;
    // dustMaterial.blending= THREE.AdditiveBlending;
    // dustMaterial.side=THREE.DoubleSide;
    // dustMaterial.opacity=0.2;
    dustMaterial.freeze();

    const uniforms = {
      uTime: {
        value: 0,
      },
    };
    dustMaterial.onBeforeCompile = shader => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = 'attribute float opacity;attribute float broken;\n varying float vOpacity; varying float vBroken; varying vec3 vPos; \n ' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        ['vec3 transformed = vec3( position );', 'vOpacity = opacity; vBroken = broken; vPos = position;'].join('\n'),
      );
      shader.fragmentShader = 'uniform float uTime; varying float vBroken; varying float vOpacity; varying vec3 vPos;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
                `
                  vec4 diffuseColor = vec4( diffuse, vOpacity);
      
                `,
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <alphamap_fragment>',
        [
          'float broken = abs( sin( 1.0 - vBroken ) ) - texture2D( alphaMap, vUv ).g;',
          'if ( broken < 0.0001 ) discard;',
        ].join('\n'),
      );
    };

    const matrix = new THREE.Matrix4();
    const setInstancedMeshPositions = mesh1 => {
      for (let i = 0; i < mesh1.count; i++) {
        mesh.getMatrixAt(i, matrix);
        dummy.scale.x = 0.00001;
        dummy.scale.y = 0.00001;
        dummy.scale.z = 0.00001;
        dummy.position.x = (Math.random() - 0.5) * 0.2;
        dummy.position.y = -0.2;
        dummy.position.z = i * 0.1;
        dummy.rotation.x = Math.random() * i;
        dummy.rotation.y = Math.random() * i;
        dummy.rotation.z = Math.random() * i;
        info.velocity[i] = (new THREE.Vector3(
          0,
          0,
          -0.8 - Math.random()));
        info.velocity[i].divideScalar(20);
        dummy.updateMatrix();
        mesh1.setMatrixAt(i, dummy.matrix);
      }
      mesh1.instanceMatrix.needsUpdate = true;
    };

    const addInstancedMesh = dustGeometry => {
      const geometry = _getDustGeometry(dustGeometry);
      mesh = new THREE.InstancedMesh(geometry, dustMaterial, particleCount);
      group.add(mesh);
      // app.add(group);
      setInstancedMeshPositions(mesh);
    };

    // ##################################################### load glb #####################################################
    // let dustGeometry;
    let dustApp;
    (async () => {
      const u = `${baseUrl}/assets/smoke.glb`;
      dustApp = await new Promise((resolve, reject) => {
        const {gltfLoader} = useLoaders();
        gltfLoader.load(u, resolve, function onprogress() {}, reject);
      });
      dustApp.scene.traverse(o => {
        if (o.isMesh) {
          console.log('addInstancedMesh');
          addInstancedMesh(o.geometry);
        }
      });
    })();

    // ##################################################### object #####################################################
    let mesh = null;
    const dummy = new THREE.Object3D();

    let currentRotate = 0;
    let preRotate = 0;
    const narutoEndTime = 0;
    let sonicBoomInApp = false;
    useFrame(({timestamp}) => {
      if (narutoRunTime === 1) {
        if (!sonicBoomInApp) {
          // console.log('add-dust');
          app.add(group);
          sonicBoomInApp = true;
        }
      }
      if (mesh) {
        group.position.copy(localPlayer.position);
        group.rotation.copy(localPlayer.rotation);
        if (localPlayer.avatar) {
          group.position.y -= localPlayer.avatar.height;
          group.position.y += 0.2;
        }

        group.position.x -= 0.3 * currentDir.x;
        group.position.z -= 0.3 * currentDir.z;

        if (localPlayer.rotation.x === 0) { currentRotate = -localPlayer.rotation.y; } else {
          if (localPlayer.rotation.y > 0) { currentRotate = (localPlayer.rotation.y - Math.PI); } else { currentRotate = (localPlayer.rotation.y + Math.PI); }
        }
        // console.log('sonic-boom-front-dust');

        const opacityAttribute = mesh.geometry.getAttribute('opacity');
        const brokenAttribute = mesh.geometry.getAttribute('broken');
        const startTimesAttribute = mesh.geometry.getAttribute('startTimes');
        for (let i = 0; i < particleCount; i++) {
          mesh.getMatrixAt(i, matrix);
          matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

          if (lastStopSw === 1 && narutoRunTime === 0) {
            opacityAttribute.setX(i, 1);
            brokenAttribute.setX(i, Math.random() - 0.6);

            dummy.scale.x = 0.06 + Math.random() * 0.05;
            dummy.scale.y = 0.06 + Math.random() * 0.05;
            dummy.scale.z = 0.06 + Math.random() * 0.05;

            dummy.position.x = (Math.random() - 0.5) * 0.2;
            dummy.position.y = -0.2;
            dummy.position.z = (Math.random() - 0.5) * 0.2;

            info.velocity[i].x = 0;
            info.velocity[i].y = 0;
            info.velocity[i].z = -0.8 - Math.random();

            info.velocity[i].divideScalar(20);
          }

          if (dummy.position.z < 50) {
            opacityAttribute.setX(i, opacityAttribute.getX(i) - 0.04);
            if (brokenAttribute.getX(i) < 1) { brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.045); } else { brokenAttribute.setX(i, 1); }
            dummy.rotation.z = timestamp / 500.0;

            dummy.scale.x *= 1.03;
            dummy.scale.y *= 1.03;
            dummy.scale.z *= 1.03;

            if (narutoRunTime > 0) {
              dummy.scale.x = 0.00001;
              dummy.scale.y = 0.00001;
              dummy.scale.z = 0.00001;
            }
            if (Math.abs(currentRotate - preRotate) >= 0.175) {
              dummy.scale.x = 0.00001;
              dummy.scale.y = 0.00001;
              dummy.scale.z = 0.00001;
            }
            info.velocity[i].add(acc);
            dummy.position.add(info.velocity[i]);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          }
        }

        mesh.instanceMatrix.needsUpdate = true;
        opacityAttribute.needsUpdate = true;
        brokenAttribute.needsUpdate = true;
        startTimesAttribute.needsUpdate = true;
      }
      if (lastStopSw === 1 && narutoRunTime === 0) {
        lastStopSw = 0;

        // narutoEndTime=timestamp;
      }
      if (lastStopSw === 0) {
        if (sonicBoomInApp) {
          mesh.getMatrixAt(particleCount - 1, matrix);
          matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
          if (dummy.position.z > 40) {
            // console.log('remove-dust');
            app.remove(group);
            sonicBoomInApp = false;
          }
        }
      }
      // group.updateMatrixWorld();
      app.updateMatrixWorld();
      preRotate = currentRotate;
    });
  }
  app.setComponent('renderPriority', 'low');

  return app;
};
