/*
this file contains the main objects we use for rendering.
the purpose of this file is to hold these objects and to make sure they are correctly configured (e.g. handle canvas resize)
*/

import * as THREE from 'three';
window.THREE = THREE
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import {makePromise} from './util.js';
import {minFov} from './constants.js';

window.addBox = function() {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshStandardMaterial({
    color:'red'
  })
  const mesh = new THREE.Mesh(geometry, material)
  window.rootScene.add(mesh)
  mesh.position.y = 1
  mesh.position.z = -6
  mesh.updateMatrixWorld()
  window.box = mesh

  window.cutByPlane(window.box, new THREE.Plane(), window.output)
}

window.output = { object1: null, object2: null };

window.transformFreeVectorInverse = function( v, m ) {

  // input:
  // vector interpreted as a free vector
  // THREE.Matrix4 orthogonal matrix (matrix without scale)

  const x = v.x, y = v.y, z = v.z;
  const e = m.elements;

  v.x = e[ 0 ] * x + e[ 1 ] * y + e[ 2 ] * z;
  v.y = e[ 4 ] * x + e[ 5 ] * y + e[ 6 ] * z;
  v.z = e[ 8 ] * x + e[ 9 ] * y + e[ 10 ] * z;

  return v;

}

window.transformTiedVectorInverse = function( v, m ) {

  // input:
  // vector interpreted as a tied (ordinary) vector
  // THREE.Matrix4 orthogonal matrix (matrix without scale)

  const x = v.x, y = v.y, z = v.z;
  const e = m.elements;

  v.x = e[ 0 ] * x + e[ 1 ] * y + e[ 2 ] * z - e[ 12 ];
  v.y = e[ 4 ] * x + e[ 5 ] * y + e[ 6 ] * z - e[ 13 ];
  v.z = e[ 8 ] * x + e[ 9 ] * y + e[ 10 ] * z - e[ 14 ];

  return v;

}

window.transformPlaneToLocalSpace = function( plane, m, resultPlane ) {
window._v1 = new THREE.Vector3();

  resultPlane.normal.copy( plane.normal );
  resultPlane.constant = plane.constant;

  const referencePoint = transformTiedVectorInverse( plane.coplanarPoint( window._v1 ), m );

  transformFreeVectorInverse( resultPlane.normal, m );

  // recalculate constant (like in setFromNormalAndCoplanarPoint)
  resultPlane.constant = - referencePoint.dot( resultPlane.normal );

}

window.cutByPlane = function( object, plane, output ) {

  this.minSizeForBreak = 1.4;
  this.smallDelta = 0.0001;

  this.tempLine1 = new THREE.Line3();
  this.tempPlane1 = new THREE.Plane();
  this.tempPlane2 = new THREE.Plane();
  this.tempPlane_Cut = new THREE.Plane();
  this.tempCM1 = new THREE.Vector3();
  this.tempCM2 = new THREE.Vector3();
  this.tempVector3 = new THREE.Vector3();
  this.tempVector3_2 = new THREE.Vector3();
  this.tempVector3_3 = new THREE.Vector3();
  this.tempVector3_P0 = new THREE.Vector3();
  this.tempVector3_P1 = new THREE.Vector3();
  this.tempVector3_P2 = new THREE.Vector3();
  this.tempVector3_N0 = new THREE.Vector3();
  this.tempVector3_N1 = new THREE.Vector3();
  this.tempVector3_AB = new THREE.Vector3();
  this.tempVector3_CB = new THREE.Vector3();
  this.tempResultObjects = { object1: null, object2: null };

  this.segments = [];

  // Returns breakable objects in output.object1 and output.object2 members, the resulting 2 pieces of the cut.
  // object2 can be null if the plane doesn't cut the object.
  // object1 can be null only in case of internal error
  // Returned value is number of pieces, 0 for error.

  const geometry = object.geometry;
  const coords = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;

  const numPoints = coords.length / 3;
  let numFaces = numPoints / 3;

  let indices = geometry.getIndex();

  if ( indices ) {

    indices = indices.array;
    numFaces = indices.length / 3;

  }

  function getVertexIndex( faceIdx, vert ) {

    // vert = 0, 1 or 2.

    const idx = faceIdx * 3 + vert;

    return indices ? indices[ idx ] : idx;

  }

  const points1 = [];
  const points2 = [];

  const delta = this.smallDelta;

  // Reset segments mark
  const numPointPairs = numPoints * numPoints;
  for ( let i = 0; i < numPointPairs; i ++ ) this.segments[ i ] = false;

  const p0 = this.tempVector3_P0;
  const p1 = this.tempVector3_P1;
  const n0 = this.tempVector3_N0;
  const n1 = this.tempVector3_N1;

  // Iterate through the faces to mark edges shared by coplanar faces
  for ( let i = 0; i < numFaces - 1; i ++ ) {

    const a1 = getVertexIndex( i, 0 );
    const b1 = getVertexIndex( i, 1 );
    const c1 = getVertexIndex( i, 2 );

    // Assuming all 3 vertices have the same normal
    n0.set( normals[ a1 ], normals[ a1 ] + 1, normals[ a1 ] + 2 );

    for ( let j = i + 1; j < numFaces; j ++ ) {

      const a2 = getVertexIndex( j, 0 );
      const b2 = getVertexIndex( j, 1 );
      const c2 = getVertexIndex( j, 2 );

      // Assuming all 3 vertices have the same normal
      n1.set( normals[ a2 ], normals[ a2 ] + 1, normals[ a2 ] + 2 );

      const coplanar = 1 - n0.dot( n1 ) < delta;

      if ( coplanar ) {

        if ( a1 === a2 || a1 === b2 || a1 === c2 ) {

          if ( b1 === a2 || b1 === b2 || b1 === c2 ) {

            this.segments[ a1 * numPoints + b1 ] = true;
            this.segments[ b1 * numPoints + a1 ] = true;

          }	else {

            this.segments[ c1 * numPoints + a1 ] = true;
            this.segments[ a1 * numPoints + c1 ] = true;

          }

        }	else if ( b1 === a2 || b1 === b2 || b1 === c2 ) {

          this.segments[ c1 * numPoints + b1 ] = true;
          this.segments[ b1 * numPoints + c1 ] = true;

        }

      }

    }

  }

  // Transform the plane to object local space
  const localPlane = this.tempPlane_Cut;
  object.updateMatrix();
  transformPlaneToLocalSpace( plane, object.matrix, localPlane );

  // Iterate through the faces adding points to both pieces
  for ( let i = 0; i < numFaces; i ++ ) {

    const va = getVertexIndex( i, 0 );
    const vb = getVertexIndex( i, 1 );
    const vc = getVertexIndex( i, 2 );

    for ( let segment = 0; segment < 3; segment ++ ) {

      const i0 = segment === 0 ? va : ( segment === 1 ? vb : vc );
      const i1 = segment === 0 ? vb : ( segment === 1 ? vc : va );

      const segmentState = this.segments[ i0 * numPoints + i1 ];

      if ( segmentState ) continue; // The segment already has been processed in another face

      // Mark segment as processed (also inverted segment)
      this.segments[ i0 * numPoints + i1 ] = true;
      this.segments[ i1 * numPoints + i0 ] = true;

      p0.set( coords[ 3 * i0 ], coords[ 3 * i0 + 1 ], coords[ 3 * i0 + 2 ] );
      p1.set( coords[ 3 * i1 ], coords[ 3 * i1 + 1 ], coords[ 3 * i1 + 2 ] );

      // mark: 1 for negative side, 2 for positive side, 3 for coplanar point
      let mark0 = 0;

      let d = localPlane.distanceToPoint( p0 );

      if ( d > delta ) {

        mark0 = 2;
        points2.push( p0.clone() );

      } else if ( d < - delta ) {

        mark0 = 1;
        points1.push( p0.clone() );

      } else {

        mark0 = 3;
        points1.push( p0.clone() );
        points2.push( p0.clone() );

      }

      // mark: 1 for negative side, 2 for positive side, 3 for coplanar point
      let mark1 = 0;

      d = localPlane.distanceToPoint( p1 );

      if ( d > delta ) {

        mark1 = 2;
        points2.push( p1.clone() );

      } else if ( d < - delta ) {

        mark1 = 1;
        points1.push( p1.clone() );

      }	else {

        mark1 = 3;
        points1.push( p1.clone() );
        points2.push( p1.clone() );

      }

      if ( ( mark0 === 1 && mark1 === 2 ) || ( mark0 === 2 && mark1 === 1 ) ) {

        // Intersection of segment with the plane

        this.tempLine1.start.copy( p0 );
        this.tempLine1.end.copy( p1 );

        let intersection = new THREE.Vector3();
        intersection = localPlane.intersectLine( this.tempLine1, intersection );

        if ( intersection === null ) {

          // Shouldn't happen
          console.error( 'Internal error: segment does not intersect plane.' );
          output.segmentedObject1 = null;
          output.segmentedObject2 = null;
          return 0;

        }

        points1.push( intersection );
        points2.push( intersection.clone() );

      }

    }

  }

  // Calculate debris mass (very fast and imprecise):
  const newMass = object.userData.mass * 0.5;

  // Calculate debris Center of Mass (again fast and imprecise)
  this.tempCM1.set( 0, 0, 0 );
  let radius1 = 0;
  const numPoints1 = points1.length;

  if ( numPoints1 > 0 ) {

    for ( let i = 0; i < numPoints1; i ++ ) this.tempCM1.add( points1[ i ] );

    this.tempCM1.divideScalar( numPoints1 );
    for ( let i = 0; i < numPoints1; i ++ ) {

      const p = points1[ i ];
      p.sub( this.tempCM1 );
      radius1 = Math.max( radius1, p.x, p.y, p.z );

    }

    this.tempCM1.add( object.position );

  }

  this.tempCM2.set( 0, 0, 0 );
  let radius2 = 0;
  const numPoints2 = points2.length;
  if ( numPoints2 > 0 ) {

    for ( let i = 0; i < numPoints2; i ++ ) this.tempCM2.add( points2[ i ] );

    this.tempCM2.divideScalar( numPoints2 );
    for ( let i = 0; i < numPoints2; i ++ ) {

      const p = points2[ i ];
      p.sub( this.tempCM2 );
      radius2 = Math.max( radius2, p.x, p.y, p.z );

    }

    this.tempCM2.add( object.position );

  }

  let object1 = null;
  let object2 = null;

  let numObjects = 0;

  if ( numPoints1 > 4 ) {

    object1 = new THREE.Mesh( new ConvexGeometry( points1 ), object.material );
    object1.position.copy( this.tempCM1 );
    object1.quaternion.copy( object.quaternion );

    // this.prepareBreakableObject( object1, newMass, object.userData.velocity, object.userData.angularVelocity, 2 * radius1 > this.minSizeForBreak );

    numObjects ++;

  }

  if ( numPoints2 > 4 ) {

    object2 = new THREE.Mesh( new ConvexGeometry( points2 ), object.material );
    object2.position.copy( this.tempCM2 );
    object2.quaternion.copy( object.quaternion );

    // this.prepareBreakableObject( object2, newMass, object.userData.velocity, object.userData.angularVelocity, 2 * radius2 > this.minSizeForBreak );

    numObjects ++;

  }

  output.object1 = object1;
  output.object2 = object2;

  return numObjects;

}

// // https://stackoverflow.com/a/62544968/3596736
//   // Adding 'support' for instanceof Proxy:
// (() => {
//   var proxyInstances = new WeakSet()
  
//   // Optionally save the original in global scope:
//   let originalProxy = Proxy

//   Proxy = new Proxy(Proxy, {
//     construct(target, args) {
//       var newProxy = new originalProxy(...args)
//       proxyInstances.add(newProxy)
//       return newProxy
//     },
//     get(obj, prop) {
//       if (prop == Symbol.hasInstance) {
//         return (instance) => {
//           return proxyInstances.has(instance)
//         }
//       }
//       return Reflect.get(...arguments)
//     }
//   })
// })()

// THREE.Matrix4.prototype.multiplyMatrices = (function () {
//   var cachedFunction = THREE.Matrix4.prototype.multiplyMatrices

//   let startTime;

//   return function () {
//     startTime = performance.now()

//     var result = cachedFunction.apply(this, arguments) // use .apply() to call it

//     window.totalTime += performance.now() - startTime
//     window.count += 1
//     return result
//   }
// })()

// XXX enable this when the code is stable; then, we will have many more places to add missing matrix updates
// THREE.Object3D.DefaultMatrixAutoUpdate = false;

let canvas = null, context = null, renderer = null, composer = null;

let waitPromise = makePromise();
const waitForLoad = () => waitPromise;

function bindCanvas(c) {
  // initialize renderer
  canvas = c;
  context = canvas && canvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
    // preserveDrawingBuffer: false,
    xrCompatible: true,
  });
  renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: true,
    rendererExtensionFragDepth: true,
    logarithmicDepthBuffer: true,
  });

  const rect = renderer.domElement.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.autoClear = false;
  renderer.sortObjects = false;
  renderer.physicallyCorrectLights = true;
  // renderer.outputEncoding = THREE.sRGBEncoding;
  // renderer.gammaFactor = 2.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (!canvas) {
    canvas = renderer.domElement;
  }
  if (!context) {
    context = renderer.getContext();
  }
  // context.enable(context.SAMPLE_ALPHA_TO_COVERAGE);
  renderer.xr.enabled = true;

  // initialize post-processing
  {
    const size = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();
    const encoding = THREE.sRGBEncoding;
    const renderTarget = new THREE.WebGLMultisampleRenderTarget(size.x * pixelRatio, size.y * pixelRatio, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      encoding,
    });
    renderTarget.samples = context.MAX_SAMPLES;
    composer = new EffectComposer(renderer, renderTarget);
  }

  waitPromise.accept();
}

function getRenderer() {
  return renderer;
}
function getContainerElement() {
  const canvas = renderer.domElement;
  const container = canvas.parentNode;
  return container;
}

function getComposer() {
  return composer;
}


const scene = new THREE.Object3D();
scene.name = 'scene';
const sceneHighPriority = new THREE.Object3D();
sceneHighPriority.name = 'highPriorioty';
const sceneLowPriority = new THREE.Object3D();
sceneLowPriority.name = 'lowPriorioty';
const rootScene = new THREE.Scene();
window.rootScene = rootScene
rootScene.name = 'root';
rootScene.autoUpdate = false;
const postSceneOrthographic = new THREE.Scene();
postSceneOrthographic.name = 'postOrthographic';
const postScenePerspective = new THREE.Scene();
postScenePerspective.name = 'postPerspective';
rootScene.add(sceneHighPriority);
rootScene.add(scene);
rootScene.add(sceneLowPriority);

// const orthographicScene = new THREE.Scene();
// const avatarScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(minFov, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);
camera.rotation.order = 'YXZ';
camera.name = 'sceneCamera';
/* const avatarCamera = camera.clone();
avatarCamera.near = 0.2;
avatarCamera.updateProjectionMatrix(); */

const dolly = new THREE.Object3D();
// fixes a bug: avatar glitching when dropped exactly at an axis
const epsilon = 0.000001;
dolly.position.set(epsilon, epsilon, epsilon);
dolly.add(camera);
// dolly.add(avatarCamera);
scene.add(dolly);

const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
// scene.add(orthographicCamera);

window.addEventListener('resize', e => {
  const renderer = getRenderer();
  if (renderer) {
    if (renderer.xr.getSession()) {
      renderer.xr.isPresenting = false;
    }

    const containerElement = getContainerElement();
    const {width, height} = containerElement.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio;
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);
    // renderer2.setSize(window.innerWidth, window.innerHeight);

    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    // avatarCamera.aspect = aspect;
    // avatarCamera.updateProjectionMatrix();
    
    if (renderer.xr.getSession()) {
      renderer.xr.isPresenting = true;
    }

    const composer = getComposer();
    if (composer) {
      composer.setSize(width, height);
      composer.setPixelRatio(pixelRatio);
    }
  }
});

/* addDefaultLights(scene, {
  shadowMap: true,
});
addDefaultLights(sceneHighPriority, {
  shadowMap: false,
});
addDefaultLights(sceneLowPriority, {
  shadowMap: false,
});
addDefaultLights(avatarScene, {
  shadowMap: false,
}); */

/* const renderer2 = new CSS3DRenderer();
renderer2.setSize(window.innerWidth, window.innerHeight);
renderer2.domElement.style.position = 'absolute';
renderer2.domElement.style.top = 0;
if (canvas.parentNode) {
  document.body.insertBefore(renderer2.domElement, canvas);
} */

export {
  waitForLoad,
  // AppManager,
  bindCanvas,
  getRenderer,
  getContainerElement,
  getComposer,
  scene,
  rootScene,
  postSceneOrthographic,
  postScenePerspective,
  // avatarScene,
  camera,
  orthographicCamera,
  // avatarCamera,
  dolly,
  /*orbitControls, renderer2,*/
  sceneHighPriority,
  sceneLowPriority,
  // iframeContainer,
  // iframeContainer2,
  // appManager,
};
