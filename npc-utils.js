
import * as THREE from 'three';
import {
  rootScene,
} from './renderer.js';
import physicsManager from './physics-manager.js';

const identityQuaternion = new THREE.Quaternion();

const heightTolerance = 0.6;
const localVector2D = new THREE.Vector2();
const localVector = new THREE.Vector3();

const materialIdle = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(221,213,213)')});
const materialReached = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(171,163,163)')});
const materialIdle2 = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(121,213,113)')});
const materialReached2 = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(71,163,63)')});
const materialFrontier = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(92,133,214)')});
const materialFrontier2 = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(42,83,164)')});
const materialStart = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(191,64,64)')});
const materialDest = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(191,64,170)')});
const materialPath = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(149,64,191)')});
const materialPath2 = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(99,14,141)')});
const materialObstacle = new THREE.MeshStandardMaterial({color: new THREE.Color('rgb(134,134,121)')});

class PathFinder {
  constructor({width = 15, height = 15, voxelHeight = 2, lowestY = 0.1, highestY = 15, highestY2 = 30, debugRender = false}) {
    this.npcPlayerPivotHeight = 1.518240094787793; // todo: Do not hard-cdoe.
    this.localPlayerPivotHeight = 1.2576430977951292; // todo: Do not hard-cdoe.
    this.isStart = false;
    this.isRising = false;
    this.isRising2 = false;
    this.isGeneratedVoxelMap = false;
    this.width = (width % 2 === 0) ? (width + 1) : (width);
    this.height = (height % 2 === 0) ? (height + 1) : (height);
    this.voxelHeight = voxelHeight;
    this.voxelHeightHalf = this.voxelHeight / 2;
    this.start = new THREE.Vector3(0, 0, 3);
    this.dest = new THREE.Vector3(13, 0, 3);
    this.lowestY = lowestY;
    this.highestY = highestY;
    this.highestY2 = highestY2;
    this.voxelsY = this.lowestY;
    this.voxelsY2 = this.lowestY;
    this.isAutoInit = false;
    this.debugRender = debugRender;
    this.voxelo = {};

    this.frontiers = [];
    this.voxels = new THREE.Group();
    this.voxels.name = 'voxels';
    this.voxels.visible = debugRender;
    rootScene.add(this.voxels);
    this.voxels2 = new THREE.Group();
    rootScene.add(this.voxels2);
    this.voxels2.name = 'voxels2';
    this.voxels2.visible = debugRender;

    this.geometry = new THREE.BoxGeometry();
  }

  getPath(startPosition, destPosition) {
    this.reset();

    this.start.copy(window.npcPlayer.position); // test
    this.start.x = Math.round(this.start.x);
    this.start.z = Math.round(this.start.z);
    // this.start.x += 1; // test // todo: Do not collide with npcPlayer
    this.start.y -= this.npcPlayerPivotHeight; // todo: Not hard-code npcPlayer's height.
    this.start.y -= 0.05; // Prevent -X axis not collide, +X axis collide problem, when half height = 0.5 and position.y = 0.5 too.

    this.dest.copy(window.localPlayer.position);
    this.dest.y -= this.localPlayerPivotHeight;

    const voxel = new THREE.Mesh(this.geometry, materialStart);
    voxel.position.copy(this.start);
    this.detect(voxel, 0.1);
    this.voxels.add(voxel);
    voxel.updateMatrixWorld(); // test
    console.log('found');
  }

  reset() {
    // todo
  }

  detect(voxel, stepY) {
    const isCollide = this.overlapVoxel(voxel); // todo: Do not collide with npcPlayer
    if (isCollide) {
      voxel.position.y += stepY;
      this.detect(voxel, stepY);
    }
  }

  update() {
    // console.log('update');
    if (this.isRising && this.voxels) { // mark: generate voxel map
      this.voxels.children.forEach((voxel, i) => {
        if (voxel._risingState === 'initial' || voxel._risingState === 'colliding') {
          voxel.position.y += 0.1;
          voxel.updateMatrixWorld();
          // const isCollide = physicsManager.collideCapsule(0.5, 1, voxel.position, identityQuaternion.set(0, 0, 0, 1), 1);
          // const isCollide = physicsManager.collideBox(0.5, 0.05, 0.5, voxel.position, identityQuaternion.set(0, 0, 0, 1), 1);
          const isCollide = physicsManager.overlapBox(0.5, this.voxelHeightHalf, 0.5, voxel.position, identityQuaternion.set(0, 0, 0, 1));
          if (isCollide) {
            voxel._risingState = 'colliding';
          } else if (voxel._risingState === 'colliding') {
            voxel._risingState = 'stopped';
          }
        }
      });
      this.voxelsY += 0.1;
      if (this.voxelsY > this.highestY) {
        this.rise2();
      } else {
        if (this.isAutoInit) this.update();
      }
    }
    if (this.isRising2 && this.voxels2) {
      // if (this.debugRender) console.log(this.getVoxel2(0, 0).position.y);
      this.voxels2.children.forEach((voxel, i) => {
        if (voxel._risingState === 'initial' || voxel._risingState === 'colliding') {
          voxel.position.y += 0.1;
          voxel.updateMatrixWorld();
          // const isCollide = physicsManager.collideCapsule(0.5, 1, voxel.position, identityQuaternion.set(0, 0, 0, 1), 1);
          // const isCollide = physicsManager.collideBox(0.5, 0.05, 0.5, voxel.position, identityQuaternion.set(0, 0, 0, 1), 1);
          const isCollide = physicsManager.overlapBox(0.5, this.voxelHeightHalf, 0.5, voxel.position, identityQuaternion.set(0, 0, 0, 1));
          if (isCollide) {
            voxel._risingState = 'colliding';
          } else if (voxel._risingState === 'colliding') {
            voxel._risingState = 'stopped';
          }
        }
      });
      this.voxelsY2 += 0.1;
      if (this.voxelsY2 > this.highestY2) {
        this.generateVoxelMap();
        this.resolveInit(true);
      } else {
        if (this.isAutoInit) this.update();
      }
    }
  }

  generateVoxelMap() {
    this.isRising = false;
    this.isRising2 = false;

    for (let z = -(this.height - 1) / 2; z < this.height / 2; z++) {
      for (let x = -(this.width - 1) / 2; x < this.width / 2; x++) {
        const currentVoxel = this.getVoxel(x, z);

        const leftVoxel2 = this.getVoxel2(x - 1, z);
        if (leftVoxel2) {
          const biasToLayer2 = leftVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._leftVoxel = leftVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const leftVoxel = this.getVoxel(x - 1, z);
            if (leftVoxel && leftVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._leftVoxel = leftVoxel;
            }
          }
        }

        const rightVoxel2 = this.getVoxel2(x + 1, z);
        if (rightVoxel2) {
          const biasToLayer2 = rightVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._rightVoxel = rightVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const rightVoxel = this.getVoxel(x + 1, z);
            if (rightVoxel && rightVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._rightVoxel = rightVoxel;
            }
          }
        }

        const btmVoxel2 = this.getVoxel2(x, z - 1);
        if (btmVoxel2) {
          const biasToLayer2 = btmVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._btmVoxel = btmVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const btmVoxel = this.getVoxel(x, z - 1);
            if (btmVoxel && btmVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._btmVoxel = btmVoxel;
            }
          }
        }

        const topVoxel2 = this.getVoxel2(x, z + 1);
        if (topVoxel2) {
          const biasToLayer2 = topVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._topVoxel = topVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const topVoxel = this.getVoxel(x, z + 1);
            if (topVoxel && topVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._topVoxel = topVoxel;
            }
          }
        }
      }
    }
    for (let z = -(this.height - 1) / 2; z < this.height / 2; z++) {
      for (let x = -(this.width - 1) / 2; x < this.width / 2; x++) {
        const currentVoxel = this.getVoxel2(x, z);

        const leftVoxel2 = this.getVoxel2(x - 1, z);
        if (leftVoxel2) {
          const biasToLayer2 = leftVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._leftVoxel = leftVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const leftVoxel = this.getVoxel(x - 1, z);
            if (leftVoxel && leftVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._leftVoxel = leftVoxel;
            }
          }
        }

        const rightVoxel2 = this.getVoxel2(x + 1, z);
        if (rightVoxel2) {
          const biasToLayer2 = rightVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._rightVoxel = rightVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const rightVoxel = this.getVoxel(x + 1, z);
            if (rightVoxel && rightVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._rightVoxel = rightVoxel;
            }
          }
        }

        const btmVoxel2 = this.getVoxel2(x, z - 1);
        if (btmVoxel2) {
          const biasToLayer2 = btmVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._btmVoxel = btmVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const btmVoxel = this.getVoxel(x, z - 1);
            if (btmVoxel && btmVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._btmVoxel = btmVoxel;
            }
          }
        }

        const topVoxel2 = this.getVoxel2(x, z + 1);
        if (topVoxel2) {
          const biasToLayer2 = topVoxel2.position.y - currentVoxel.position.y;
          if (biasToLayer2 < heightTolerance) {
            currentVoxel._topVoxel = topVoxel2;
          } else if (biasToLayer2 > this.voxelHeight) {
            const topVoxel = this.getVoxel(x, z + 1);
            if (topVoxel && topVoxel.position.y - currentVoxel.position.y < heightTolerance) {
              currentVoxel._topVoxel = topVoxel;
            }
          }
        }
      }
    }

    // this.voxels.children.forEach((voxel, i) => {
    //   if (voxel.position.y > 3) {
    //     voxel._isObstacle = true
    //     voxel.material = materialObstacle
    //   }
    // })

    this.isGeneratedVoxelMap = true;
    if (this.debugRender) console.log('generated voxel map');
  }

  resetStartDest(startLayer, startX, startZ, destLayer, destX, destZ) {
    this.isFound = false;
    this.frontiers.length = 0;

    this.voxels.children.length = 0;

    this.start.set(startX, startZ);
    this.dest.set(destX, destZ);

    if (startLayer === 1) {
      this.startVoxel = this.getVoxel(startX, startZ);
    } else if (startLayer === 2) {
      this.startVoxel = this.getVoxel2(startX, startZ);
    }
    this.startVoxel._isStart = true;
    this.startVoxel._isReached = true;
    // this.startVoxel._priority = start.manhattanDistanceTo(dest)
    this.startVoxel._priority = this.start.distanceTo(this.dest);
    this.startVoxel._costSoFar = 0;
    this.frontiers.push(this.startVoxel);
    this.startVoxel.material = materialStart;

    if (destLayer === 1) {
      this.destVoxel = this.getVoxel(destX, destZ);
    } else if (destLayer === 2) {
      this.destVoxel = this.getVoxel2(destX, destZ);
    }
    this.destVoxel._isDest = true;
    this.destVoxel.material = materialDest;
  }

  rise() {
    this.isRising = true;
  }

  // riseAgain() {
  //   this.voxels.children.forEach(voxel => {
  //     voxel._risingState = 'initial';
  //   });
  // }

  rise2() {
    this.isRising = false;

    this.voxels2.children.forEach((voxel, i) => {
      voxel.position.y = this.voxels.children[i].position.y;
    });

    this.isRising2 = true;
  }

  getVoxel(x, z) {
    return this.voxelo[x + '_' + z];
  }

  createVoxel(x, y, z) {
    const voxel = new THREE.Mesh(this.geometry, materialIdle);
    voxel.position.set(x, y, z);
    this.voxelo[x + '_' + z] = voxel;
    this.voxels.add(voxel);
    if (this.overlapVoxel(voxel)) {
      this.detect(voxel, 0.1);
    } else {
      this.detect(voxel, -0.1);
    }
  }

  overlapVoxel(voxel) {
    const isCollide = physicsManager.overlapBox(0.5, this.voxelHeightHalf, 0.5, voxel.position, identityQuaternion);
    return isCollide;
  }

  swapStartDest() {
    localVector2D.copy(this.start);
    this.start.copy(this.dest);
    this.dest.copy(localVector2D);
  }

  tenStep() {
    if (!this.isGeneratedVoxelMap) {
      console.warn('voxel map not generated.');
      return;
    }
    for (let i = 0; i < 10; i++) this.step();
  }

  untilFound() {
    if (!this.isGeneratedVoxelMap) {
      console.warn('voxel map not generated.');
      return;
    }
    while (this.frontiers.length > 0 && !this.isFound) this.step();
  }

  xyToSerial(width, xy) { // :index
    return xy.y * width + xy.x;
  }

  recur(voxel) {
    if (voxel) {
      if (!voxel._isStart && !voxel._isDest) { // todo: Don't run if !this.debugRender.
        if (voxel.parent === this.voxels) {
          voxel.material = materialPath;
        } else {
          voxel.material = materialPath2;
        }
      }
      if (voxel._prev) voxel._prev._next = voxel;
      this.recur(voxel._prev);
    }
  }

  stepVoxel(voxel, prevVoxel) {
    if (!voxel) return;
    if (voxel._isObstacle) return;
    const newCost = prevVoxel._costSoFar + 1;
    // if (voxel._isReached === false || newCost < voxel._costSoFar) {
    if (voxel._isReached === false) {
      // Seems no need `|| newCost < voxel._costSoFar` ? Need? http://disq.us/p/2mgpazs
      voxel._isReached = true;
      voxel._costSoFar = newCost;

      // todo: use Vector2 instead of _x _z.
      // voxel._priority = localVector2D.set(voxel._x, voxel._z).manhattanDistanceTo(dest)
      // voxel._priority = localVector2D.set(voxel._x, voxel._z).distanceToSquared(dest)
      voxel._priority = localVector2D.set(voxel._x, voxel._z).distanceTo(this.dest);
      voxel._priority += newCost;
      this.frontiers.push(voxel);
      this.frontiers.sort((a, b) => a._priority - b._priority);

      if (!voxel._isStart && !voxel._isDest) {
        if (voxel.parent === this.voxels) {
          voxel.material = materialFrontier;
        } else {
          voxel.material = materialFrontier2;
        }
      }
      voxel._prev = prevVoxel;
    }
    if (voxel._isDest) {
      // if (this.debugRender) console.log('found');
      this.isFound = true;
      this.recur(voxel);
    }
  }

  step() {
    // if (this.debugRender) console.log('step');
    // debugger
    if (this.frontiers.length <= 0) {
      if (this.debugRender) console.log('finish');
      return;
    }
    if (this.isFound) return;

    const currentVoxel = this.frontiers.shift();
    if (!currentVoxel._isStart) {
      if (currentVoxel.parent === this.voxels) {
        currentVoxel.material = materialReached;
      } else {
        currentVoxel.material = materialReached2;
      }
    }

    const leftVoxel = this.createVoxel(currentVoxel.position.x - 1, currentVoxel.z);
    if (currentVoxel._leftVoxel) {
      this.stepVoxel(currentVoxel._leftVoxel, currentVoxel);
      if (this.isFound) return;
    }

    if (currentVoxel._rightVoxel) {
      this.stepVoxel(currentVoxel._rightVoxel, currentVoxel);
      if (this.isFound) return;
    }

    if (currentVoxel._btmVoxel) {
      this.stepVoxel(currentVoxel._btmVoxel, currentVoxel);
      if (this.isFound) return;
    }

    if (currentVoxel._topVoxel) {
      this.stepVoxel(currentVoxel._topVoxel, currentVoxel);
      // if (this.isFound) return
    }
  }

  toggleVoxelsVisible() {
    this.voxels.visible = !this.voxels.visible;
  }

  toggleVoxels2Visible() {
    this.voxels2.visible = !this.voxels2.visible;
  }

  toggleVoxelsWireframe() {
    materialIdle.wireframe = !materialIdle.wireframe;
  }

  toggleVoxels2Wireframe() {
    materialIdle2.wireframe = !materialIdle2.wireframe;
  }

  moveDownVoxels() {
    this.voxels.position.y -= 0.5;
    this.voxels.updateMatrixWorld();
  }

  moveDownVoxels2() {
    this.voxels2.position.y -= 0.5;
    this.voxels2.updateMatrixWorld();
  }

  getHighestY() {
    let highestY = -Infinity;
    this.voxels.children.forEach(voxel => {
      if (voxel.position.y > highestY) highestY = voxel.position.y;
    });
    return highestY;
  }

  getHighestY2() {
    let highestY = -Infinity;
    this.voxels2.children.forEach(voxel => {
      if (voxel.position.y > highestY) highestY = voxel.position.y;
    });
    return highestY;
  }
}

export {PathFinder};
