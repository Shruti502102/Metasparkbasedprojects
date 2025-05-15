/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 */

import D from 'Diagnostics';
import {
  apply,
  BaseCharacterBehavior,
  ICharacterConfig,
  ICharacterExtender,
  InverseKinematicsChain,
  lookAt,
  lookAt_lt_dn,
  mainBehaviorExecutor,
  Math3D,
  objPool,
  smoothstep01,
  V3
} from "spark-procedural-animations";
import {
  LizardFactory,
  LizardJointType,
  LizzyConfig
} from "./App.Infrastructure";

// the speed of turning (80% per second)
const TURN_SPEED_PER_SEC = 0.8;
// minimum distance from idial foot position that triggers step
const MIN_STEP_DISTANCE = 0.02;

/**
 * Function that starts procedural animations.
 * It will
 * 1) create LizardFactory
 * 2) add single character with given name and given configuration
 * 3) specify behavior to execute
 * 4) initialize asynchroneously
 *
 * @param name - unique name of character object
 * @param configFactory - configuration for the current character
 * @param extenders - optional character extenders
 */
async function startProceduralAnimations(
  name: string,
  configFactory: {new (): ICharacterConfig},
  ...extenders: ICharacterExtender[]
  ): Promise<void> {
    await new LizardFactory()
    .addCharacter(name, name, configFactory, ...extenders)
    .start(MainController)
    .initializeAsync();
}
/**
 * Main controller - character behavior that implements procedural animation inline in its initialize method
 */
class MainController extends BaseCharacterBehavior<LizardFactory> {
  private readonly _stepping:{[key:string]: boolean} = {
    [LizardJointType.IK_ARM_L]: false,
    [LizardJointType.IK_ARM_R]: false,
    [LizardJointType.IK_LEG_L]: false,
    [LizardJointType.IK_LEG_R]: false
  }
  initialize(): void {
    // get reference for the lizard character from the factory
    const lz = this.factory.lizzy;
    // get references for the target object from the factory
    const target = this.factory.touch.target;
    // get the lengths of spine and tail inverse kinematics chains in world space
    const spineMag = lz.spine.iniPosAsWorld.sub_(lz.spine.root.worldPos).magnitude;
    const tailMag = lz.tail.iniPosAsWorld.sub_(lz.tail.root.worldPos).magnitude;

    // for each leg start behavior that will control leg placement
    this.testIfLegNeedToStep(lz.armL, lz.armR.name);
    this.testIfLegNeedToStep(lz.armR, lz.armL.name);
    this.testIfLegNeedToStep(lz.legL, lz.legR.name);
    this.testIfLegNeedToStep(lz.legR, lz.legL.name);

    // the following function will be invoked on each frame
    this.playEndless(() => {

      // unit vector for horizontal direction to target (note the center 0,0,0 is at the lizard center position)
      const dirToTarget = target.pos.setY_(0).normalize_();
      // get lizard forward vector
      const currFw = lz.fw;
      // get dot product between direction to target and lizard forward
      const dotProduct = currFw.dot(dirToTarget);

      // unless the lizard is facing the target (dot product 1) execute the following code
      if(dotProduct < 0.999) {
        // 1) lizard rotation
        // quaternion rotation when facing the target
        const targetRot = lookAt(dirToTarget, V3.up);
        // progress fraction per frame
        const progress01 = TURN_SPEED_PER_SEC * mainBehaviorExecutor.smoothDeltaTime;
        // apply rotation towards facing target by current fraction
        lz.rot = lz.rot.rotateTo(targetRot, progress01);

        // 2) spine inverse kinematics
        // spine root in world space
        const spineRootWorldPos = lz.spine.root.worldPos;
        // direction to spine tip initial position in world space
        const iniDirSpine = spineRootWorldPos.dirTo(lz.spine.iniPosAsWorld);
        // move spine chain direction towards the target spine orientation
        const spineDir = iniDirSpine.rotTo01_(dirToTarget, 0.5);
        // move spine tip towards target orientation
        lz.spine.worldPos = spineRootWorldPos.add(spineDir.by(spineMag));

        // 3) tail inverse kinematics
        // tail root in world space
        const tailRootWorldPos = lz.tail.root.worldPos;
        // take the opposite of the direction to target and reflect it off the sagittal plane
        const dirTail = lz.bk.rotTo01_( Math3D.reflectPointOverPlane(dirToTarget.negated, lz.rt, lz.pos), 0.5);
        // update the length of tail in such a way so that when it is straight back it is at full length
        // and when it is rotated the length deminished so that to add curvature
        lz.tail.worldPos = tailRootWorldPos.add(dirTail.by(tailMag * (dotProduct * 0.1 + 0.9)));
      }

      // head turns towards the target
      // here we use lookAt_lt_dn function because head parent
      // has LEFT vector as forward direction and DOWN vector as up direction
      lz.head.parent.worldRot =
        lz.head.parent.worldRot.rotateTo(lookAt_lt_dn(lz.head.parent.worldPos.dirTo(target.pos), V3.up), 0.5);

    }, objPool);

  }
  /**
   * This function will start vtest that runs on each frame and checks if foot has moved enough
   * away from idial position to initiate step action
   * @param leg - leg inverse kinematics chain
   * @param oppositeName - the name of the opposite leg
   */
  private testIfLegNeedToStep(leg: InverseKinematicsChain, oppositeName: string): void {
    // any step action for that foot must be marked as finished
    this._stepping[leg.name] = false;

    const pos = leg.worldPos;
    const lz = this.factory.lizzy;
    this.playEndless((x,i,b) => {
      // execute the following function after the spine inverse kinematics chain has been solved
      lz.spine.addPostSolveAction(x, _ => {
        // if the opposite  (left vs right) leg is not stepping
        if(!this._stepping[oppositeName]){
          const target = leg.iniPosAsWorld;
          // check the distance to the ideal position
          if(target.distanceTo(pos) > MIN_STEP_DISTANCE) {
            // stop the function that checks for step
            b.finish();
            // mark current leg as stepping
            this._stepping[leg.name] = true;
            // on the next frame start step
            this.onNextFrame(() => this.step(leg, oppositeName));
            return;
          }
        }
        // fix leg position to the initial world position (grounding legs)
        leg.worldPos = pos;
      });
    }, objPool);
  }
  private step(leg: InverseKinematicsChain, oppositeName: string): void {
    // distance to the ideal position
    const dist = leg.pos.distanceTo(leg.iniPos);

    // set leg actuator command to move leg to the initial position in world space
    leg.a
    .move.asWorld()
    // the target position is set with isDynamic flag set to true - so that to evaluate target position on each frame
    .to(_ => leg.iniPosAsWorld, true)
    // move the leg following curve while the curve control point
    // is center point + vetor up by the given distance
    .relCurveControl1(_ => V3.up.by(dist))
    ;

    // step time depends on distance to step
    const time = 12 * dist;
    // after 40% of the step is complete mark the stepping leg as finished to allow
    // step action to start on the opposite leg
    this.waitFor(time * 0.4).then(() => {this._stepping[leg.name] = false});
    // apply step using smoothstep function
    this.playFor(time, x => apply(smoothstep01(x), leg), objPool)
    // when the step is complete start to test for step again
    .then(() => this.testIfLegNeedToStep(leg, oppositeName));
  }

}


(async function () {

  await startProceduralAnimations('Lizzy', LizzyConfig);

})();
