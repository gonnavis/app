/*
this file bootstraps the webaverse engine.
it uses the help of various managers and stores, and executes the render loop.
*/

import * as THREE from 'three';
window.THREE = THREE;
import WSRTC from 'wsrtc/wsrtc.js';
import Avatar from './avatars/avatars.js';
// import * as CharacterHupsModule from './character-hups.js';
import * as CharacterSfxModule from './character-sfx.js';
import physx from './physx.js';
import ioManager from './io-manager.js';
import physicsManager from './physics-manager.js';
import {world} from './world.js';
import * as blockchain from './blockchain.js';
import cameraManager from './camera-manager.js';
import game from './game.js';
import hpManager from './hp-manager.js';
// import equipmentRender from './equipment-render.js';
// import * as characterController from './character-controller.js';
import {playersManager} from './players-manager.js';
import postProcessing from './post-processing.js';
import {Stats} from './stats.js';
import {loadAudioBuffer} from './util.js';
import {
  getRenderer,
  scene,
  sceneHighPriority,
  sceneLowPriority,
  // rootScene,
  camera,
  dolly,
  bindCanvas,
  getComposer,
  rootScene,
} from './renderer.js';
import transformControls from './transform-controls.js';
import * as metaverseModules from './metaverse-modules.js';
import dioramaManager from './diorama.js';
import metaversefileApi from 'metaversefile';
import WebaWallet from './src/components/wallet.js';
// const leftHandOffset = new THREE.Vector3(0.2, -0.2, -0.4);
// const rightHandOffset = new THREE.Vector3(-0.2, -0.2, -0.4);

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
// const localVector3 = new THREE.Vector3();
// const localVector4 = new THREE.Vector3();
// const localVector2D = new THREE.Vector2();
const localQuaternion = new THREE.Quaternion();
// const localQuaternion2 = new THREE.Quaternion();
// const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
// const localMatrix2 = new THREE.Matrix4();
const localMatrix3 = new THREE.Matrix4();
// const localArray = Array(4);
// const localArray2 = Array(4);
// const localArray3 = Array(4);
// const localArray4 = Array(4);

const sessionMode = 'immersive-vr';
const sessionOpts = {
  requiredFeatures: [
    'local-floor',
    // 'bounded-floor',
  ],
  optionalFeatures: [
    'hand-tracking',
  ],
};

const frameEvent = new MessageEvent('frame', {
  data: {
    now: 0,
    timeDiff: 0,
    // lastTimestamp: 0,
  },
});
const rendererStats = Stats();

const _loadAudioContext = async () => {
  const audioContext = WSRTC.getAudioContext();
  Avatar.setAudioContext(audioContext);
  await audioContext.audioWorklet.addModule('avatars/microphone-worklet.js');
};

/* const voiceFiles = `\
B6_somnium_65_01 - Part_1.wav
B6_somnium_66_01 - Part_1.wav
D5-begin20_10_09_03 - Part_1.wav
D5-begin20_10_09_03 - Part_2.wav
D5-begin20_10_09_09 - Part_1.wav
D5-begin20_10_09_10 - Part_1.wav
D5-begin20_10_09_10 - Part_2.wav
D5-begin20_10_09_10 - Part_3.wav
D5-begin20_10_09_11 - Part_1.wav
D5-begin20_10_09_14 - Part_1.wav
E5-begin40_10_04_05 - Part_1.wav
E5-begin40_10_04_06 - Part_1.wav
E5-begin40_10_04_07 - Part_1.wav
E5-begin40_10_04_07 - Part_2.wav
E5-begin40_10_04_09 - Part_1.wav
E5-begin40_10_05_01 - Part_1.wav
E5-begin40_10_06_02 - Part_1.wav
E5-begin40_10_06_05 - Part_1.wav
E5-begin40_10_06_07 - Part_1.wav
E5-begin40_10_07_24 - Part_1.wav
E5-begin40_10_08_01 - Part_1.wav
E5-begin40_10_08_01 - Part_2.wav
E5-begin40_10_08_02 - Part_1.wav
E5-begin40_10_08_03 - Part_1.wav
E5-begin40_10_08_03 - Part_2.wav
E5-begin40_10_08_04 - Part_1.wav
E5-begin40_10_08_04 - Part_2.wav
E5-begin40_10_08_05 - Part_1.wav
E5-begin40_10_08_06 - Part_1.wav
E5-begin40_10_08_07 - Part_1.wav
E5-begin40_10_08_07 - Part_2.wav
E5-begin40_10_08_10 - Part_1.wav
E5-begin40_10_08_10 - Part_2.wav
E5-begin40_10_08_10 - Part_3.wav
E5-begin40_10_08_10 - Part_4.wav
E5-begin40_10_08_12 - Part_1.wav
E5-begin40_10_08_13 - Part_1.wav
E5-begin40_10_10_02 - Part_1.wav
E5-begin40_10_12_02 - Part_1.wav
E5-begin40_10_14_11 - Part_1.wav
E5-begin40_10_14_15 - Part_1.wav
E5-begin40_10_14_15 - Part_2.wav
E6-wrap_74_10_05_02 - Part_1.wav
E6-wrap_74_10_19_03 - Part_1.wav
E6-wrap_74_10_19_21 - Part_1.wav
E6-wrap_74_10_19_29 - Part_1.wav`
  .split('\n')
  .map(voiceFile => `/@proxy/https://webaverse.github.io/shishi-voicepack/vocalizations/${voiceFile}`); */
/* const numFiles = 361;
const voiceFiles = Array(numFiles).fill(0).map((_, i) => `${i + 1}.wav`)
  .map(voiceFile => `/@proxy/https://webaverse.github.io/shishi-voicepack/syllables/${voiceFile}`); */
const _loadVoicePack = async () => {
  const audioContext = Avatar.getAudioContext();

  const [
    syllableFiles,
    audioBuffer,
  ] = await Promise.all([
    (async () => {
      const res = await fetch('https://webaverse.github.io/shishi-voicepack/syllables/syllable-files.json');
      const j = await res.json();
      return j;
    })(),
    loadAudioBuffer(audioContext, 'https://webaverse.github.io/shishi-voicepack/syllables/syllables.mp3'),
  ]);

  const localPlayer = metaversefileApi.useLocalPlayer();
  localPlayer.characterHups.setVoicePack(syllableFiles, audioBuffer);
};

export default class Webaverse extends EventTarget {
  constructor() {
    super();

    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.bottom = '0px';
    rendererStats.domElement.style.display = 'none';
    document.body.appendChild(rendererStats.domElement);

    this.loadPromise = (async () => {
      await Promise.all([
        physx.waitForLoad(),
        Avatar.waitForLoad(),
        _loadAudioContext(),
        CharacterSfxModule.waitForLoad(),
        transformControls.waitForLoad(),
        metaverseModules.waitForLoad(),
        WebaWallet.waitForLoad(),
        // _loadVoicePack(),
      ]);
    })();
    this.contentLoaded = false;
  }
  
  waitForLoad() {
    return this.loadPromise;
  }

  getRenderer() {
    return getRenderer();
  }
  getScene() {
    return scene;
  }
  getSceneHighPriority() {
    return sceneHighPriority;
  }
  getSceneLowPriority() {
    return sceneLowPriority;
  }
  getCamera() {
    return camera;
  }
  
  setContentLoaded() {
    this.contentLoaded = true;
  }
  bindInput() {
    ioManager.bindInput();
  }
  bindInterface() {
    ioManager.bindInterface();
    blockchain.bindInterface();
  }
  bindCanvas(c) {
    bindCanvas(c);
    
    postProcessing.bindCanvas();
  }
  bindPreviewCanvas(canvas) {
    game.bindPreviewCanvas(canvas);
  }
  async isXrSupported() {
    if (navigator.xr) {
      let ok = false;
      try {
        ok = await navigator.xr.isSessionSupported(sessionMode);
      } catch (err) {
        console.warn(err);
      }
      return ok;
    } else {
      return false;
    }
  }
  /* toggleMic() {
    return world.toggleMic();
  } */
  async enterXr() {
    const renderer = getRenderer();
    const session = renderer.xr.getSession();
    if (session === null) {
      let session = null;
      try {
        session = await navigator.xr.requestSession(sessionMode, sessionOpts);
      } catch(err) {
        try {
          session = await navigator.xr.requestSession(sessionMode);
        } catch(err) {
          console.warn(err);
        }
      }
      if (session) {
        function onSessionEnded(e) {
          session.removeEventListener('end', onSessionEnded);
          renderer.xr.setSession(null);
        }
        session.addEventListener('end', onSessionEnded);
        renderer.xr.setSession(session);
        // renderer.xr.setReferenceSpaceType('local-floor');
      }
    } else {
      await session.end();
    }
  }
  
  /* injectRigInput() {
    let leftGamepadPosition, leftGamepadQuaternion, leftGamepadPointer, leftGamepadGrip, leftGamepadEnabled;
    let rightGamepadPosition, rightGamepadQuaternion, rightGamepadPointer, rightGamepadGrip, rightGamepadEnabled;

    const localPlayer = metaversefileApi.useLocalPlayer();
    const renderer = getRenderer();
    const session = renderer.xr.getSession();
    if (session) {
      let inputSources = Array.from(session.inputSources);
      inputSources = ['right', 'left']
        .map(handedness => inputSources.find(inputSource => inputSource.handedness === handedness));
      let pose;
      if (inputSources[0] && (pose = frame.getPose(inputSources[0].gripSpace, renderer.xr.getReferenceSpace()))) {
        localMatrix.fromArray(pose.transform.matrix)
          .premultiply(dolly.matrix)
          .decompose(localVector2, localQuaternion2, localVector3);
        if (!inputSources[0].profiles.includes('oculus-hand')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI*0.5));
        } else {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(0, 0, 1), Math.PI*0.5)).multiply(localQuaternion3.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.2));
        }
        leftGamepadPosition = localVector2.toArray(localArray);
        leftGamepadQuaternion = localQuaternion2.toArray(localArray2);

        const {gamepad} = inputSources[0];
        if (gamepad && gamepad.buttons.length >= 2) {
          const {buttons} = gamepad;
          leftGamepadPointer = buttons[0].value;
          leftGamepadGrip = buttons[1].value;
        } else {
          leftGamepadPointer = 0;
          leftGamepadGrip = 0;
        }
        leftGamepadEnabled = true;
      } else {
        leftGamepadEnabled = false;
      }
      if (inputSources[1] && (pose = frame.getPose(inputSources[1].gripSpace, renderer.xr.getReferenceSpace()))) {
        localMatrix.fromArray(pose.transform.matrix)
          .premultiply(dolly.matrix)
          .decompose(localVector2, localQuaternion2, localVector3);
        if (!inputSources[1].profiles.includes('oculus-hand')) {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(1, 0, 0), -Math.PI*0.5));
        } else {
          localQuaternion2.multiply(localQuaternion3.setFromAxisAngle(localVector3.set(0, 0, 1), -Math.PI*0.5)).multiply(localQuaternion3.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI*0.2));
        }
        rightGamepadPosition = localVector2.toArray(localArray3);
        rightGamepadQuaternion = localQuaternion2.toArray(localArray4);

        const {gamepad} = inputSources[1];
        if (gamepad && gamepad.buttons.length >= 2) {
          const {buttons} = gamepad;
          rightGamepadPointer = buttons[0].value;
          rightGamepadGrip = buttons[1].value;
        } else {
          rightGamepadPointer = 0;
          rightGamepadGrip = 0;
        }
        rightGamepadEnabled = true;
      } else {
        rightGamepadEnabled = false;
      }
    } else {
      localMatrix.copy(localPlayer.matrixWorld)
        .decompose(localVector, localQuaternion, localVector2);
    }

    const handOffsetScale = localPlayer ? localPlayer.avatar.height / 1.5 : 1;
    if (!leftGamepadPosition) {
      leftGamepadPosition = localVector2.copy(localVector)
        .add(localVector3.copy(leftHandOffset).multiplyScalar(handOffsetScale).applyQuaternion(localQuaternion))
        .toArray();
      leftGamepadQuaternion = localQuaternion.toArray();
      leftGamepadPointer = 0;
      leftGamepadGrip = 0;
      leftGamepadEnabled = false;
    }
    if (!rightGamepadPosition) {
      rightGamepadPosition = localVector2.copy(localVector)
        .add(localVector3.copy(rightHandOffset).multiplyScalar(handOffsetScale).applyQuaternion(localQuaternion))
        .toArray();
      rightGamepadQuaternion = localQuaternion.toArray();
      rightGamepadPointer = 0;
      rightGamepadGrip = 0;
      rightGamepadEnabled = false;
    }

    rigManager.setLocalAvatarPose([
      [localVector.toArray(), localQuaternion.toArray()],
      [leftGamepadPosition, leftGamepadQuaternion, leftGamepadPointer, leftGamepadGrip, leftGamepadEnabled],
      [rightGamepadPosition, rightGamepadQuaternion, rightGamepadPointer, rightGamepadGrip, rightGamepadEnabled],
    ]);
  } */
  
  render(timestamp, timeDiff) {
    const renderer = getRenderer();
    frameEvent.data.now = timestamp;
    frameEvent.data.timeDiff = timeDiff;
    this.dispatchEvent(frameEvent);
    // frameEvent.data.lastTimestamp = timestamp;
    
    // equipment panel render
    // equipmentRender.previewScene.add(world.lights);
    // equipmentRender.render();

    getComposer().render();
    game.debugMode && rendererStats.update(renderer);
  }
  
  startLoop() {
    const renderer = getRenderer();
    if (!renderer) {
      throw new Error('must bind canvas first');
    }
    
    let lastTimestamp = performance.now();

    const animate = (timestamp, frame) => {
      timestamp = timestamp ?? performance.now();
      const timeDiff = timestamp - lastTimestamp;
      const timeDiffCapped = Math.min(Math.max(timeDiff, 0), 100); 
      //const timeDiffCapped = timeDiff;

      ioManager.update(timeDiffCapped);
      // this.injectRigInput();
      
      cameraManager.update(timeDiffCapped);
      
      const localPlayer = metaversefileApi.useLocalPlayer();
      if (this.contentLoaded && physicsManager.getPhysicsEnabled()) {
        //if(performance.now() - lastTimestamp < 1000/60) return; // There might be a better solution, we need to limit the simulate time otherwise there will be jitter at different FPS
        // debugger
        physicsManager.simulatePhysics(timeDiffCapped); 
        localPlayer.updatePhysics(timestamp, timeDiffCapped);
      }

      lastTimestamp = timestamp;

      transformControls.update();
      game.update(timestamp, timeDiffCapped);
      
      localPlayer.updateAvatar(timestamp, timeDiffCapped);
      playersManager.update(timestamp, timeDiffCapped);
      
      world.appManager.tick(timestamp, timeDiffCapped, frame);

      hpManager.update(timestamp, timeDiffCapped);

      ioManager.updatePost();
      
      game.pushAppUpdates();
      game.pushPlayerUpdates();

      dioramaManager.update(timestamp, timeDiffCapped);

      const session = renderer.xr.getSession();
      const xrCamera = session ? renderer.xr.getCamera(camera) : camera;
      localMatrix.multiplyMatrices(xrCamera.projectionMatrix, /*localMatrix2.multiplyMatrices(*/xrCamera.matrixWorldInverse/*, physx.worldContainer.matrixWorld)*/);
      localMatrix3.copy(xrCamera.matrix)
        .premultiply(dolly.matrix)
        .decompose(localVector, localQuaternion, localVector2);
        
      this.render(timestamp, timeDiffCapped);

    }
    renderer.setAnimationLoop(animate);

    _startHacks();
  }
}

// import {MMDLoader} from 'three/examples/jsm/loaders/MMDLoader.js';
const _startHacks = () => {
  const localPlayer = metaversefileApi.useLocalPlayer();
  const vpdAnimations = Avatar.getAnimations().filter(animation => animation.name.endsWith('.vpd'));

  const material = new THREE.MeshStandardMaterial({
    color: 'red',
  });
  const x = 0;
  const y = 10;
  const z = -25
  {
    const size = new THREE.Vector3(3, 2, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDHips = mesh;
    rootScene.add(mesh);
    mesh.position.set(x, y, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDHips = body;
  }
  {
    const size = new THREE.Vector3(3, 2, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDChest = mesh;
    rootScene.add(mesh);
    mesh.position.set(x, y + 2, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDChest = body;
  }
  {
    const size = new THREE.Vector3(1, 2, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDHead = mesh;
    rootScene.add(mesh);
    mesh.position.set(x, y + 4, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDHead = body;
  }
  {
    const size = new THREE.Vector3(1, 2, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDLeftLeg = mesh;
    rootScene.add(mesh);
    mesh.position.set(x - 1, y - 2, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDLeftLeg = body;
  }
  {
    const size = new THREE.Vector3(1, 2, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDRightLeg = mesh;
    rootScene.add(mesh);
    mesh.position.set(x + 1, y - 2, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDRightLeg = body;
  }
  {
    const size = new THREE.Vector3(1, 3, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDLeftCalf = mesh;
    rootScene.add(mesh);
    mesh.position.set(x - 1, y - 4.5, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDLeftCalf = body;
  }
  {
    const size = new THREE.Vector3(1, 3, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDRightCalf = mesh;
    rootScene.add(mesh);
    mesh.position.set(x + 1, y - 4.5, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDRightCalf = body;
  }
  {
    const size = new THREE.Vector3(1, 3, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDLeftArm = mesh;
    rootScene.add(mesh);
    mesh.position.set(x - 2, y + 1.5, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDLeftArm = body;
  }
  {
    const size = new THREE.Vector3(1, 3, 1).multiplyScalar(0.9);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    window.meshRDRightArm = mesh;
    rootScene.add(mesh);
    mesh.position.set(x + 2, y + 1.5, z);
    mesh.updateMatrixWorld();

    const body = physicsManager.addBoxGeometry(mesh.position, mesh.quaternion, size.clone().multiplyScalar(0.5), true);
    window.bodyRDRightArm = body;
  }

  const PxD6Axis = {
    eX: 0, // !< motion along the X axis
    eY: 1, // !< motion along the Y axis
    eZ: 2, // !< motion along the Z axis
    eTWIST: 3, // !< motion around the X axis
    eSWING1: 4, // !< motion around the Y axis
    eSWING2: 5, // !< motion around the Z axis
    eCOUNT: 6,
  };
  const PxD6Motion = {
    eLOCKED: 0, // !< The DOF is locked, it does not allow relative motion.
    eLIMITED: 1, // !< The DOF is limited, it only allows motion within a specific range.
    eFREE: 2, // !< The DOF is free and has its full range of motion.
  };

  const jointHipsChest = physicsManager.addJoint(window.bodyRDHips, window.bodyRDChest, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Quaternion(), new THREE.Quaternion(), false);
  const jointChestHead = physicsManager.addJoint(window.bodyRDChest, window.bodyRDHead, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Quaternion(), new THREE.Quaternion());
  const jointHipsLeftLeg = physicsManager.addJoint(window.bodyRDHips, window.bodyRDLeftLeg, new THREE.Vector3(-1, -1, 0), new THREE.Vector3(0, 1, 0), new THREE.Quaternion(), new THREE.Quaternion());
  const jointHipsRightLeg = physicsManager.addJoint(window.bodyRDHips, window.bodyRDRightLeg, new THREE.Vector3(1, -1, 0), new THREE.Vector3(0, 1, 0), new THREE.Quaternion(), new THREE.Quaternion());
  const jointLeftLegLeftCalf = physicsManager.addJoint(window.bodyRDLeftLeg, window.bodyRDLeftCalf, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1.5, 0), new THREE.Quaternion(), new THREE.Quaternion());
  const jointRightLegRightCalf = physicsManager.addJoint(window.bodyRDRightLeg, window.bodyRDRightCalf, new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1.5, 0), new THREE.Quaternion(), new THREE.Quaternion());
  const jointChestLeftArm = physicsManager.addJoint(window.bodyRDChest, window.bodyRDLeftArm, new THREE.Vector3(-1.5, 0.5, 0), new THREE.Vector3(0.5, 1, 0), new THREE.Quaternion(), new THREE.Quaternion());
  const jointChestRightArm = physicsManager.addJoint(window.bodyRDChest, window.bodyRDRightArm, new THREE.Vector3(1.5, 0.5, 0), new THREE.Vector3(-0.5, 1, 0), new THREE.Quaternion(), new THREE.Quaternion());

  physicsManager.setJointMotion(jointHipsChest, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);
  physicsManager.setJointMotion(jointChestHead, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);
  physicsManager.setJointMotion(jointHipsLeftLeg, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);
  physicsManager.setJointMotion(jointHipsRightLeg, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);
  physicsManager.setJointMotion(jointLeftLegLeftCalf, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);
  physicsManager.setJointMotion(jointRightLegRightCalf, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);
  physicsManager.setJointMotion(jointChestLeftArm, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);
  physicsManager.setJointMotion(jointChestRightArm, PxD6Axis.eTWIST, PxD6Motion.eLIMITED);

  physicsManager.setJointTwistLimit(jointHipsChest, -Math.PI / 6, Math.PI / 6);
  physicsManager.setJointTwistLimit(jointChestHead, -Math.PI / 4, Math.PI / 6);
  physicsManager.setJointTwistLimit(jointHipsLeftLeg, 0, Math.PI / 2);
  physicsManager.setJointTwistLimit(jointHipsRightLeg, 0, Math.PI / 2);
  physicsManager.setJointTwistLimit(jointLeftLegLeftCalf, -Math.PI / 2, 0);
  physicsManager.setJointTwistLimit(jointRightLegRightCalf, -Math.PI / 2, 0);
  physicsManager.setJointTwistLimit(jointChestLeftArm, -Math.PI / 6, Math.PI / 2);
  physicsManager.setJointTwistLimit(jointChestRightArm, -Math.PI / 6, Math.PI / 2);

  // physicsManager.setJointMotion(jointHipsChest, PxD6Axis.eSWING1, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointChestHead, PxD6Axis.eSWING1, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointHipsLeftLeg, PxD6Axis.eSWING1, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointHipsRightLeg, PxD6Axis.eSWING1, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointLeftLegLeftCalf, PxD6Axis.eSWING1, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointRightLegRightCalf, PxD6Axis.eSWING1, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointChestLeftArm, PxD6Axis.eSWING1, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointChestRightArm, PxD6Axis.eSWING1, PxD6Motion.eFREE);

  // physicsManager.setJointMotion(jointHipsChest, PxD6Axis.eSWING2, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointChestHead, PxD6Axis.eSWING2, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointHipsLeftLeg, PxD6Axis.eSWING2, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointHipsRightLeg, PxD6Axis.eSWING2, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointLeftLegLeftCalf, PxD6Axis.eSWING2, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointRightLegRightCalf, PxD6Axis.eSWING2, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointChestLeftArm, PxD6Axis.eSWING2, PxD6Motion.eFREE);
  // physicsManager.setJointMotion(jointChestRightArm, PxD6Axis.eSWING2, PxD6Motion.eFREE);

  let playerDiorama = null;
  let appDiorama = null;
  const lastEmoteKey = {
    key: -1,
    timestamp: 0,
  };
  let emoteIndex = -1;
  let poseAnimationIndex = -1;
  const _emoteKey = key => {
    const timestamp = performance.now();
    if ((timestamp - lastEmoteKey.timestamp) < 1000) {
      const key1 = lastEmoteKey.key;
      const key2 = key;
      emoteIndex = (key1 * 10) + key2;
      
      lastEmoteKey.key = -1;
      lastEmoteKey.timestamp = 0;
    } else {
      lastEmoteKey.key = key;
      lastEmoteKey.timestamp = timestamp;
    }
  };
  const _updateEmote = () => {
    localPlayer.removeAction('emote');
    if (emoteIndex !== -1) {
      const emoteAction = {
        type: 'emote',
        index: emoteIndex,
      };
      localPlayer.addAction(emoteAction);
    }
  };
  const _updatePoseAnimation = () => {
    localPlayer.removeAction('pose');
    if (poseAnimationIndex !== -1) {
      const animation = vpdAnimations[poseAnimationIndex];
      const poseAction = {
        type: 'pose',
        animation: animation.name,
      };
      localPlayer.addAction(poseAction);
    }
  };
  /* let mikuModel = null;
  let mikuLoaded = false;
  const _ensureMikuModel = () => {
    if (!mikuLoaded) {
      mikuLoaded = true;

      const mmdLoader = new MMDLoader();
      mmdLoader.load(
        // path to PMD/PMX file
        '/avatars/Miku_Hatsune_Ver2.pmd',
        function(mesh) {
          mikuModel = mesh;
          mikuModel.position.set(0, 0, 0);
          mikuModel.scale.setScalar(0.07);
          mikuModel.updateMatrixWorld();
          scene.add(mikuModel);

          _updateMikuModel();
        },
        // called when loading is in progresses
        function (xhr) {
          // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
        },
        // called when loading has errors
        function(error) {
          console.warn('An error happened', error);
        }
      );
    }
  };
  const _updateMikuModel = () => {
    if (mikuModel) {
      const animation = vpdAnimations[poseAnimationIndex];

      const _getBone = name => mikuModel.skeleton.bones.find(b => b.name === name);
      const mmdBones = {
        // Root: _getBone('センター'), // deliberately excluded

        mixamorigHips: _getBone('下半身'),
        // mixamorigSpine: _makeFakeBone(), // not present in mmd
        mixamorigSpine1: _getBone('上半身'),
        // mixamorigSpine2: _makeFakeBone(), // not present in mmd
        mixamorigNeck: _getBone('首'),
        mixamorigHead: _getBone('頭'),
        // Eye_L: _getBone('左目'), // deliberately excluded
        // Eye_R: _getBone('右目'), // deliberately excluded

        mixamorigLeftShoulder: _getBone('左肩'),
        mixamorigLeftArm: _getBone('左腕'),
        mixamorigLeftForeArm: _getBone('左ひじ'),
        mixamorigLeftHand: _getBone('左手首'),
        mixamorigLeftHandThumb2: _getBone('左親指２'),
        mixamorigLeftHandThumb1: _getBone('左親指１'),
        // mixamorigLeftHandThumb0: _makeFakeBone(), // not present in mmd
        mixamorigLeftHandIndex3: _getBone('左人指３'),
        mixamorigLeftHandIndex2: _getBone('左人指２'),
        mixamorigLeftHandIndex1: _getBone('左人指１'),
        mixamorigLeftHandMiddle3: _getBone('左中指３'),
        mixamorigLeftHandMiddle2: _getBone('左中指２'),
        mixamorigLeftHandMiddle1: _getBone('左中指１'),
        mixamorigLeftHandRing3: _getBone('左薬指３'),
        mixamorigLeftHandRing2: _getBone('左薬指２'),
        mixamorigLeftHandRing1: _getBone('左薬指１'),
        mixamorigLeftHandPinky3: _getBone('左小指３'),
        mixamorigLeftHandPinky2: _getBone('左小指２'),
        mixamorigLeftHandPinky1: _getBone('左小指１'),
        mixamorigLeftUpLeg: _getBone('左足'),
        mixamorigLeftLeg: _getBone('左ひざ'),
        mixamorigLeftFoot: _getBone('左足首'),

        mixamorigRightShoulder: _getBone('右肩'),
        mixamorigRightArm: _getBone('右腕'),
        mixamorigRightForeArm: _getBone('右ひじ'),
        mixamorigRightHand: _getBone('右手首'),
        mixamorigRightHandThumb2: _getBone('右親指２'),
        mixamorigRightHandThumb1: _getBone('右親指１'),
        // mixamorigRightHandThumb0: _makeFakeBone(), // not present in mmd
        mixamorigRightHandIndex3: _getBone('右人指３'),
        mixamorigRightHandIndex2: _getBone('右人指２'),
        mixamorigRightHandIndex1: _getBone('右人指１'),
        mixamorigRightHandMiddle3: _getBone('右中指３'),
        mixamorigRightHandMiddle2: _getBone('右中指２'),
        mixamorigRightHandMiddle1: _getBone('右中指１'),
        mixamorigRightHandRing3: _getBone('右薬指３'),
        mixamorigRightHandRing2: _getBone('右薬指２'),
        mixamorigRightHandRing1: _getBone('右薬指１'),
        mixamorigRightHandPinky3: _getBone('右小指３'),
        mixamorigRightHandPinky2: _getBone('右小指２'),
        mixamorigRightHandPinky1: _getBone('右小指１'),
        mixamorigRightUpLeg: _getBone('右足'),
        mixamorigRightLeg: _getBone('右ひざ'),
        mixamorigRightFoot: _getBone('右足首'),
        mixamorigLeftToeBase: _getBone('左つま先'),
        mixamorigRightToeBase: _getBone('右つま先'),
      };

      for (const k in animation.interpolants) {
        const match = k.match(/^([\s\S]+?)\.(position|quaternion)$/);
        const boneName = match[1];
        const isPosition = match[2] === 'position';

        const bone = mmdBones[boneName];
        if (bone) {
          const src = animation.interpolants[k];
          const v = src.evaluate(0);
          if (isPosition) {
            // bone.position.fromArray(v);
          } else {
            bone.quaternion.fromArray(v);
          }
        }
      }
      mikuModel.updateMatrixWorld();
    }
  }; */
  window.addEventListener('keydown', e => {
    if (e.which === 219) { // [
      if (localPlayer.avatar) {
        (async () => {
          const audioUrl = '/sounds/pissbaby.mp3';
          // const audioUrl2 = '/sounds/music.mp3';

          const _loadAudio = u => new Promise((accept, reject) => {
            const audio = new Audio(u);
            audio.addEventListener('canplaythrough', async e => {
              accept(audio);
            }, {once: true});
            audio.addEventListener('error', e => {
              reject(e);
            });
            // audio.play();
            // audioContext.resume();
          });

          const audios = await Promise.all([
            _loadAudio(audioUrl),
            // _loadAudio(audioUrl2),
          ]);
          localPlayer.avatar.setAudioEnabled(true);

          const _createMediaStreamSource = o => {
            if (o instanceof MediaStream) {
              const audio = document.createElement('audio');
              audio.srcObject = o;
              audio.muted = true;
            }

            const audioContext = Avatar.getAudioContext();
            if (o instanceof MediaStream) {
              return audioContext.createMediaStreamSource(o);
            } else {
              return audioContext.createMediaElementSource(o);
            }
          };
          const mediaStreamSource = _createMediaStreamSource(audios[0]);
          mediaStreamSource.connect(localPlayer.avatar.getAudioInput());

          audios[0].play();
          // audios[1].play();
          audios[0].addEventListener('ended', e => {
            mediaStreamSource.disconnect();
            localPlayer.avatar.setAudioEnabled(false);
          });
        })();
      }
    } else if (e.which === 221) { // ]
      const localPlayer = metaversefileApi.useLocalPlayer();
      if (localPlayer.avatar) {
        if (!playerDiorama) {
          playerDiorama = dioramaManager.createPlayerDiorama(localPlayer, {
            label: true,
            outline: true,
            lightningBackground: true,
          });
        } else {
          playerDiorama.destroy();
          playerDiorama = null;
        }
      }
    } else if (e.which === 220) { // \\
      const targetApp = (() => {
        const worldApps = world.appManager.getApps();
        const swordApp = worldApps.find(a => /sword/i.test(a.contentId));
        if (swordApp) {
          return swordApp;
        } else {
          const wearAction = localPlayer.getAction('wear');
          if (wearAction) {
            const app = localPlayer.appManager.getAppByInstanceId(wearAction.instanceId);
            return app;
          } else {
            return null;
          }
        }
      })();

      if (!appDiorama) {
        if (targetApp) {
          appDiorama = dioramaManager.createAppDiorama(targetApp, {
            // canvas,
            // label: true,
            outline: true,
            radialBackground: true,
          });
        } else {
          console.warn('no target app');
        }
      } else {
        appDiorama.destroy();
        appDiorama = null;
      }
    } else if (e.which === 46) { // .
      emoteIndex = -1;
      _updateEmote();
    } else if (e.which === 107) { // +
      poseAnimationIndex++;
      poseAnimationIndex = Math.min(Math.max(poseAnimationIndex, -1), vpdAnimations.length - 1);
      _updatePoseAnimation();
    
      // _ensureMikuModel();
      // _updateMikuModel();
    } else if (e.which === 109) { // -
      poseAnimationIndex--;
      poseAnimationIndex = Math.min(Math.max(poseAnimationIndex, -1), vpdAnimations.length - 1);
      _updatePoseAnimation();

      // _ensureMikuModel();
      // _updateMikuModel();
    } else {
      const match = e.code.match(/^Numpad([0-9])$/);
      if (match) {
        const key = parseInt(match[1], 10);
        _emoteKey(key);
        _updateEmote();
      }
    }
  });
};