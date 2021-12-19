/* utils to bind players to their avatars
set the avatar state from the player state */

import Avatar from './avatars/avatars.js';
import {unFrustumCull} from './util.js';

const appSymbol = 'app'; // Symbol('app');
const avatarSymbol = 'avatar'; // Symbol('avatar');

export function applyPlayerTransformsToAvatar(player, session, rig) {
  if (!session) {
    rig.inputs.hmd.position.copy(player.avatarBinding.position);
    rig.inputs.hmd.quaternion.copy(player.avatarBinding.quaternion);
    rig.inputs.leftGamepad.position.copy(player.leftHand.position);
    rig.inputs.leftGamepad.quaternion.copy(player.leftHand.quaternion);
    rig.inputs.rightGamepad.position.copy(player.rightHand.position);
    rig.inputs.rightGamepad.quaternion.copy(player.rightHand.quaternion);

    rig.inputs.hmd.updateMatrix();
    rig.inputs.leftGamepad.updateMatrix();
    rig.inputs.rightGamepad.updateMatrix();
  }
}
/* export function applyPlayerMetaTransformsToAvatar(player, session, rig) {
  if (!session) {
    rig.velocity.copy(player.characterPhysics.velocity);
  }
} */
export function applyPlayerModesToAvatar(player, session, rig) {
  const aimAction = player.getAction('aim');
  const aimComponent = (() => {
    for (const action of player.getActionsState()) {
      if (action.type === 'wear') {
        const app = player.appManager.getAppByInstanceId(action.instanceId);
        for (const {key, value} of app.components) {
          if (key === 'aim') {
            return value;
          }
        }
      }
    }
    return null;
  })();
  for (let i = 0; i < 2; i++) {
    rig.setHandEnabled(i, !!session || (i === 0 && (!!aimAction && !aimAction.playerAnimation) && !!aimComponent)/* || (useTime === -1 && !!appManager.equippedObjects[i])*/);
  }
  rig.setTopEnabled(
    (!!session && (rig.inputs.leftGamepad.enabled || rig.inputs.rightGamepad.enabled))
  );
  rig.setBottomEnabled(
    (
      rig.getTopEnabled() /* ||
      rig.getHandEnabled(0) ||
      rig.getHandEnabled(1) */
    ) &&
    rig.velocity.length() < 0.001,
  );
}
export function makeAvatar(app) {
  if (app) {
    const {skinnedVrm} = app;
    if (skinnedVrm) {
      const avatar = new Avatar(skinnedVrm, {
        fingers: true,
        hair: true,
        visemes: true,
        debug: false,
      });
      avatar[appSymbol] = app;
      
      unFrustumCull(app);
      
      return avatar;
    }
  }
  return null;
}
export function applyPlayerActionsToAvatar(player, rig) {
  const jumpAction = player.getAction('jump');
  const flyAction = player.getAction('fly');
  const useAction = player.getAction('use');
  const narutoRunAction = player.getAction('narutoRun');
  const sitAction = player.getAction('sit');
  const sitAnimation = sitAction ? sitAction.animation : '';
  const danceAction = player.getAction('dance');
  const danceAnimation = danceAction ? danceAction.animation : '';
  const throwAction = player.getAction('throw');
  const aimAction = player.getAction('aim');
  const crouchAction = player.getAction('crouch');
  const chargeJump = player.getAction('chargeJump');
  const chargeJumpAnimation = chargeJump ? chargeJump.animation : '';
  const standCharge = player.getAction('standCharge');
  const standChargeAnimation = standCharge ? standCharge.animation : '';
  const fallLoop = player.getAction('fallLoop');
  const fallLoopAnimation = fallLoop ? fallLoop.animation : '';
  const swordSideSlash = player.getAction('swordSideSlash');
  const swordSideSlashAnimation = swordSideSlash ? swordSideSlash.animation : '';
  const swordTopDownSlash = player.getAction('swordTopDownSlash');
  const swordTopDownSlashAnimation = swordTopDownSlash ? swordTopDownSlash.animation : '';

  rig.jumpState = !!jumpAction;
  rig.jumpTime = player.actionInterpolants.jump.get();
  rig.flyState = !!flyAction;
  rig.flyTime = flyAction ? player.actionInterpolants.fly.get() : -1;
  rig.activateTime = player.actionInterpolants.activate.get();
  rig.useTime = player.actionInterpolants.use.get();
  rig.useAnimation = (useAction?.animation) || '';
  rig.useAnimationIndex = useAction?.index;
  rig.narutoRunState = !!narutoRunAction && !crouchAction;
  rig.narutoRunTime = player.actionInterpolants.narutoRun.get();
  rig.aimTime = player.actionInterpolants.aim.get();
  rig.aimAnimation = (aimAction?.playerAnimation) || '';
  // rig.aimDirection.set(0, 0, -1);
  // aimAction && rig.aimDirection.applyQuaternion(rig.inputs.hmd.quaternion);
  rig.sitState = !!sitAction;
  rig.sitAnimation = sitAnimation;
  rig.danceState = !!danceAction;
  rig.danceTime = player.actionInterpolants.dance.get();
  rig.danceAnimation = danceAnimation;
  rig.throwState = !!throwAction;
  rig.throwTime = player.actionInterpolants.throw.get();
  rig.crouchTime = player.actionInterpolants.crouch.getInverse();
  rig.chargeJumpTime = player.actionInterpolants.chargeJump.get();
  rig.chargeAnimation = chargeJumpAnimation;
  rig.chargeJumpState = !!chargeJump;
  rig.standChargeTime = player.actionInterpolants.standCharge.get();
  rig.standChargeAnimation = standChargeAnimation;
  rig.standChargeState = !!standCharge;
  rig.fallLoopTime = player.actionInterpolants.fallLoop.get();
  rig.fallLoopAnimation = fallLoopAnimation;
  rig.fallLoopState = !!fallLoop;
  rig.swordSideSlashTime = player.actionInterpolants.swordSideSlash.get();
  rig.swordSideSlashAnimation = swordSideSlashAnimation;
  rig.swordSideSlashState = !!swordSideSlash;
  rig.swordTopDownSlashTime = player.actionInterpolants.swordTopDownSlash.get();
  rig.swordTopDownSlashAnimation = swordTopDownSlashAnimation;
  rig.swordTopDownSlashState = !!swordTopDownSlash;

}
export function applyPlayerChatToAvatar(player, rig) {
  const localPlayerChatActions = Array.from(player.getActionsState()).filter(action => action.type === 'chat');
  const lastMessage = localPlayerChatActions.length > 0 ? localPlayerChatActions[localPlayerChatActions.length - 1] : null;
  const _applyChatEmote = message => {
    const localPlayerEmotion = message?.emotion;
    if (localPlayerEmotion) {
      // ensure new emotion and no others
      let found = false;
      for (let i = 0; i < rig.emotes.length; i++) {
        const emote = rig.emotes[i];
        if (emote.emotion) {
          if (emote.emotion === localPlayerEmotion) {
            found = true;
          } else {
            rig.emotes.splice(i, 1);
            i--;
          }
        }
      }
      if (!found) {
        const emote = {
          emotion: localPlayerEmotion,
          value: 1,
        };
        rig.emotes.push(emote);
      }
    } else {
      // ensure no emotions
      for (let i = 0; i < rig.emotes.length; i++) {
        const emote = rig.emotes[i];
        if (emote.emotion) {
          rig.emotes.splice(i, 1);
          i--;
        }
      }
    }
  };
  _applyChatEmote(lastMessage);
  
  const _applyFakeSpeech = message => {
    rig.fakeSpeechValue = message?.fakeSpeech ? 1 : 0;
  };
  _applyFakeSpeech(lastMessage);
}
export function applyPlayerToAvatar(player, session, rig) {
  applyPlayerTransformsToAvatar(player, session, rig);
  // applyPlayerMetaTransformsToAvatar(player, session, rig);
  applyPlayerModesToAvatar(player, session, rig);
  applyPlayerActionsToAvatar(player, rig);
  applyPlayerChatToAvatar(player, rig);
}
export async function switchAvatar(oldAvatar, newApp) {
  let result;
  const promises = [];
  if (oldAvatar) {
    promises.push((async () => {
      await oldAvatar[appSymbol].setSkinning(false);
    })());
  }
  if (newApp) {
    promises.push((async () => {
      await newApp.setSkinning(true);
      
      // unwear old rig
      
      if (!newApp[avatarSymbol]) {
        newApp[avatarSymbol] = makeAvatar(newApp);
      }
      result = newApp[avatarSymbol];
    })());
  } else {
    result = null;
  }
  await Promise.all(promises);
  return result;
}
