/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 */

/**
 * App.Infrastructure - set up character and services
 */

import S from 'Scene';
import R from 'Reactive';
import P from 'Patches';
import D from 'Diagnostics';
import TG from 'TouchGestures';
import {
  BaseCharacter,
  Behavior,
  CharacterData,
  characterDeafultName,
  CharacterFactory,
  FABRIK_IK,
  IActionOfT,
  ICharacter,
  ICharacterConfig,
  IIkFactory,
  IInitAsync,
  IkData,
  IkNode,
  InverseKinematicsChain,
  invoke,
  IResourcesManager,
  JointData,
  lookAt,
  lookAt_dn_lt,
  lookAt_fw_up,
  lookAt_lt_bk,
  lookAt_lt_dn,
  lookAt_lt_fw,
  lookAt_rt_bk,
  lookAt_rt_fw,
  lookAt_up_rt,
  Math3D,
  Object3D,
  objPool,
  ObjSummary,
  ObjWrap,
  playCycle,
  playEndless,
  Ray,
  sinLimitX01,
  subscribe,
  SubXYZW,
  throwError,
  V3
} from "spark-procedural-animations";


const TARGET_RADIUS_AROUND_LIZ = 0.3;

// --------- lizard model START ---------
export enum LizardJointType {
  MODEL = 'MODEL',
  ROOT = 'ROOT',
  HIP = 'HIP',
  HIP_L = 'HIP_L',
  UPPER_LEG_L = 'UPPER_LEG_L',
  LOWER_LEG_L = 'LOWER_LEG_L',
  FOOT_L = 'FOOT_L',
  HIP_R = 'HIP_R',
  UPPER_LEG_R = 'UPPER_LEG_R',
  LOWER_LEG_R = 'LOWER_LEG_R',
  FOOT_R = 'FOOT_R',
  SPINE = 'SPINE',
  CHEST = 'CHEST',
  NECK = 'NECK',
  HEAD = 'HEAD',
  EYE_L = 'EYE_L',
  EYE_R = 'EYE_R',
  SCAPULA_L = 'SCAPULA_L',
  SHOULDER_L = 'SHOULDER_L',
  UPPER_ARM_L = 'UPPER_ARM_L',
  LOWER_ARM_L = 'LOWER_ARM_L',
  HAND_L = 'HAND_L',
  SCAPULA_R = 'SCAPULA_R',
  SHOULDER_R = 'SHOULDER_R',
  UPPER_ARM_R = 'UPPER_ARM_R',
  LOWER_ARM_R = 'LOWER_ARM_R',
  HAND_R = 'HAND_R',
  TAIL_01 = 'TAIL_01',
  TAIL_02 = 'TAIL_02',
  TAIL_03 = 'TAIL_03',
  TAIL_04 = 'TAIL_04',
  TAIL_05 = 'TAIL_05',
  TAIL_06 = 'TAIL_06',
  TAIL_07 = 'TAIL_07',
  TAIL_08 = 'TAIL_08',
  TAIL_09 = 'TAIL_09',
  TAIL_10 = 'TAIL_10',
  TAIL_11 = 'TAIL_11',
  TAIL_12 = 'TAIL_12',
  TAIL_13 = 'TAIL_13',
  TAIL_14 = 'TAIL_14',
  TAIL_15 = 'TAIL_15',
  TAIL_16 = 'TAIL_16',

  IK_SPINE = 'IK_SPINE',
  IK_ARM_L = 'IK_ARM_L',
  IK_ARM_R = 'IK_ARM_R',
  IK_LEG_L = 'IK_LEG_L',
  IK_LEG_R = 'IK_LEG_R',
  IK_TAIL = 'IK_TAIL',
}
/**
 * Lizard model configuration - specifies joints, and their rotations relative to ideal
 */
export class LizzyConfig implements ICharacterConfig {
  private readonly _jointsData: { [key: string]: JointData };
  private readonly _jointsMap: { [key: string]: string };
  private readonly _reverseJointsMap: { [key: string]: string };

  constructor() {
    const j = LizardJointType;
    // mapping model joint names to the ideal joint names
    this._jointsMap = {
      [j.MODEL]: characterDeafultName,
      [j.ROOT]: 'skeleton',
      [j.HIP]: 'Root_M',
      [j.HIP_L]: 'Hip_L',
      [j.UPPER_LEG_L]: 'Knee_L',
      [j.LOWER_LEG_L]: 'Ankle_L',
      [j.HIP_R]: 'Hip_R',
      [j.UPPER_LEG_R]: 'Knee_R',
      [j.LOWER_LEG_R]: 'Ankle_R',
      [j.SPINE]: 'Spine1_M',
      [j.CHEST]: 'Chest_M',
      [j.NECK]: 'Neck_M',
      [j.HEAD]: 'Head_M',
      [j.EYE_L]: 'Eye_L',
      [j.EYE_R]: 'Eye_R',
      [j.SCAPULA_L]: 'Scapula_L',
      [j.SHOULDER_L]: 'Shoulder_L',
      [j.UPPER_ARM_L]: 'Elbow_L',
      [j.LOWER_ARM_L]: 'Wrist_L',
      [j.SCAPULA_R]: 'Scapula_R',
      [j.SHOULDER_R]: 'Shoulder_R',
      [j.UPPER_ARM_R]: 'Elbow_R',
      [j.LOWER_ARM_R]: 'Wrist_R',
      [j.TAIL_01]: 'Tail0_M',
      [j.TAIL_02]: 'Tail1_M',
      [j.TAIL_03]: 'Tail2_M',
      [j.TAIL_04]: 'Tail3_M',
      [j.TAIL_05]: 'Tail4_M',
      [j.TAIL_06]: 'Tail5_M',
      [j.TAIL_07]: 'Tail6_M',
      [j.TAIL_08]: 'Tail7_M',
      [j.TAIL_09]: 'Tail8_M',
      [j.TAIL_10]: 'Tail9_M',
      [j.TAIL_11]: 'Tail10_M',
      [j.TAIL_12]: 'Tail11_M',
      [j.TAIL_13]: 'Tail12_M',
      [j.TAIL_14]: 'Tail13_M',
      [j.TAIL_15]: 'Tail14_M',
      [j.TAIL_16]: 'Tail15_M',
    };
    // for each joint specify the rotation relative to the ideal
    this._jointsData = {
      [j.MODEL]: new JointData(j.MODEL, V3.fw, V3.up, lookAt_fw_up),
      [j.ROOT]: new JointData(j.ROOT, V3.fw, V3.up, lookAt_fw_up),
      // what in HIP joint is left (lt) we will consider forward
      // and what is down (dn) we will consider up
      [j.HIP]: new JointData(j.HIP, V3.lt, V3.dn, lookAt_lt_dn),
      // what in HIP_L joint is right (rt) we will consider forward
      // and what is forward (fw) we will consider up
      [j.HIP_L]: new JointData(j.HIP_L, V3.rt, V3.fw, lookAt_rt_fw),
      // in a similar way we setup each joint rotation
      [j.UPPER_LEG_L]: new JointData(j.UPPER_LEG_L, V3.rt, V3.fw, lookAt_rt_fw),
      [j.LOWER_LEG_L]: new JointData(j.LOWER_LEG_L, V3.dn, V3.lt, lookAt_dn_lt),
      [j.HIP_R]: new JointData(j.HIP_R, V3.lt, V3.bk, lookAt_lt_bk),
      [j.UPPER_LEG_R]: new JointData(j.UPPER_LEG_R, V3.lt, V3.bk, lookAt_lt_bk),
      [j.LOWER_LEG_R]: new JointData(j.LOWER_LEG_R, V3.up, V3.rt, lookAt_up_rt),
      [j.SPINE]: new JointData(j.SPINE, V3.lt, V3.dn, lookAt_lt_dn),
      [j.CHEST]: new JointData(j.CHEST, V3.lt, V3.dn, lookAt_lt_dn),
      [j.NECK]: new JointData(j.NECK, V3.lt, V3.dn, lookAt_lt_dn),
      [j.HEAD]: new JointData(j.HEAD, V3.lt, V3.dn, lookAt_lt_dn),
      [j.EYE_L]: new JointData(j.EYE_L, V3.lt, V3.dn, lookAt_lt_dn),
      [j.EYE_R]: new JointData(j.EYE_R, V3.lt, V3.dn, lookAt_lt_dn),
      [j.SCAPULA_L]: new JointData(j.SCAPULA_L, V3.rt, V3.bk, lookAt_rt_bk),
      [j.SHOULDER_L]: new JointData(j.SHOULDER_L, V3.rt, V3.bk, lookAt_rt_bk),
      [j.UPPER_ARM_L]: new JointData(j.UPPER_ARM_L, V3.rt, V3.bk, lookAt_rt_bk),
      [j.LOWER_ARM_L]: new JointData(j.LOWER_ARM_L, V3.dn, V3.lt, lookAt_dn_lt),
      [j.SCAPULA_R]: new JointData(j.SCAPULA_R, V3.lt, V3.fw, lookAt_lt_fw),
      [j.SHOULDER_R]: new JointData(j.SHOULDER_R, V3.lt, V3.fw, lookAt_lt_fw),
      [j.UPPER_ARM_R]: new JointData(j.UPPER_ARM_R, V3.lt, V3.fw, lookAt_lt_fw),
      [j.LOWER_ARM_R]: new JointData(j.LOWER_ARM_R, V3.up, V3.rt, lookAt_up_rt),
      [j.TAIL_01]: new JointData(j.TAIL_01, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_02]: new JointData(j.TAIL_02, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_03]: new JointData(j.TAIL_03, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_04]: new JointData(j.TAIL_04, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_05]: new JointData(j.TAIL_05, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_06]: new JointData(j.TAIL_06, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_07]: new JointData(j.TAIL_07, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_08]: new JointData(j.TAIL_08, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_09]: new JointData(j.TAIL_09, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_10]: new JointData(j.TAIL_10, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_11]: new JointData(j.TAIL_11, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_12]: new JointData(j.TAIL_12, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_13]: new JointData(j.TAIL_13, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_14]: new JointData(j.TAIL_14, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_15]: new JointData(j.TAIL_15, V3.lt, V3.dn, lookAt_lt_dn),
      [j.TAIL_16]: new JointData(j.TAIL_16, V3.lt, V3.dn, lookAt_lt_dn),
    };

    this._reverseJointsMap = {};
    for (const key in this._jointsMap) {
      const value = this._jointsMap[key];
      this._reverseJointsMap[value] = key;
    }
  }
  initialize: IActionOfT<BaseCharacter> = null;
  get jointsData(): { [key: string]: JointData } {
    return this._jointsData;
  }
  get jointsMap(): { [key: string]: string } {
    return this._jointsMap;
  }
  get reverseJointsMap(): { [key: string]: string } {
    return this._reverseJointsMap;
  }
  get type(): string { return 'lizzy'; }
  armRestFromDownDegrees: number = 0;
}
/**
 * You can override inverse kinematics factory -
 * by passing character extender with the following name that implements IIkFactory
 */
export enum LizardExtenderName {
  inverseKinematicsFactory = 'inverseKinematicsFactory',
}
/**
 * Lizard inverse kinematics factory -
 * defines the inverse kinematics chains used in this model
 */
export class LizardInverseKinematicsFactory implements IIkFactory {
  get name(): string { return LizardExtenderName.inverseKinematicsFactory; }
  initialize(source: ICharacter): void { }
  createIkChain(obn: { [key: string]: Object3D; }, type: string): InverseKinematicsChain {
    let isRight = false;
    let data: IkData = null;
    const j = LizardJointType;
    switch (type) {
      // setup spine chain
      case j.IK_SPINE:
        data = {
          nodes: [
            new IkNode(obn[j.HIP]), // HIP is the ROOT joint
            new IkNode(obn[j.SPINE]), // SPINE is the second joint
            new IkNode(obn[j.CHEST]), // CHEST is the third joint
            new IkNode(obn[j.NECK]) // NECK is the TIP joint
          ].filter(e => !!e.obj),
          allowFallBackAlg: false, // do not allow fallback to simple trigonometry
          startIndex: 1, // start inverse kinematics from index 1, i.e. SPINE
          stickToInitial: true, // on each frame return to initial to make it act springy
          extendTipBy: 0,// do not extend tip further
          isRight: false, // is not right side chain
          numberIterations:16,// when solve do this number iterations
          getRootUp: s => s.root.obj.v.up, // get root joint up
          getTipUp: s => s.tip.obj.localToWorldVec(s.tip.obj.v.up, s.root.obj), // get tip joint up
        };
        return new FABRIK_IK(j.IK_SPINE, obn[characterDeafultName], data);
      // setup arm chains
      case j.IK_ARM_R:
        isRight = true;
      case j.IK_ARM_L:
        data = {
          nodes: [
            new IkNode(obn[j.CHEST]), // the root joint is the CHEST
            new IkNode(obn[isRight ? j.SCAPULA_R : j.SCAPULA_L]),
            new IkNode(obn[isRight ? j.SHOULDER_R : j.SHOULDER_L]),
            new IkNode(obn[isRight ? j.UPPER_ARM_R : j.UPPER_ARM_L]),
            new IkNode(obn[isRight ? j.LOWER_ARM_R : j.LOWER_ARM_L]),// the tip joint is LOWER_ARM
          ],
          allowFallBackAlg: true, // intend to fall back to trigonometry
          startIndex: 2, // the first joint is index 2, i.e. SHOULDER
          stickToInitial: false,// do not have it as springy
          extendTipBy: 0.6,// extend the tip by 60% from the last joint
          isRight: isRight,//right or left side
          numberIterations: 16,// if falling back to trigonometry numberIterations will be ignored
          // specify pole target location
          getPoleTargetPosition: d =>
            FABRIK_IK.getPolePos(
              d,
              0.4, // move 40% root to tip
              (v, len) => (d.isRight ? v.rt : v.lt).by(len),// then move to the side
              (v, len) => v.bk.by(len),//then move back
            ),
          getRootUp: s => s.root.obj.v.forward,// get root joint up to be tip view forward
          getTipUp: s => s.tip.obj.localToWorldPos(s.tip.obj.v.forward, s.root.obj),
          getPlaneUp: s => // find plane normal - needed for trigonometry solution
            s.isRight
              ? Math3D.getNormalWithPoints(s.firstPos, s.polePos, s.tipPos)
              : Math3D.getNormalWithPoints(s.tipPos, s.polePos, s.firstPos),
          getCustomNodeUp: (s, n) => s.dirPlaneNormal // define node up as plane normal
        };
        return new FABRIK_IK(
          isRight ? j.IK_ARM_R : j.IK_ARM_L,
          obn[characterDeafultName],
          data,
        );
      case j.IK_LEG_R:
        isRight = true;
      case j.IK_LEG_L:
        data = {
          nodes: [
            new IkNode(obn[j.HIP]),
            new IkNode(obn[isRight ? j.HIP_R : j.HIP_L]),
            new IkNode(obn[isRight ? j.UPPER_LEG_R : j.UPPER_LEG_L]),
            new IkNode(obn[isRight ? j.LOWER_LEG_R : j.LOWER_LEG_L]),
          ],
          allowFallBackAlg: true,
          startIndex: 1,
          stickToInitial: false,
          extendTipBy: 0.6,
          isRight: isRight,
          numberIterations: 16,
          getPoleTargetPosition: d =>
            FABRIK_IK.getPolePos(
              d,
              0.2,
              (v, len) => (d.isRight ? v.rt : v.lt).by(len * 0.8),
              (v, len) => v.fw.by(len * 0.5),
            ),
          getRootUp: s => s.root.obj.v.forward,
          getTipUp: s => s.tip.obj.localToWorldPos(s.tip.obj.v.forward, s.root.obj),
          getPlaneUp: s =>
            s.isRight
              ? Math3D.getNormalWithPoints(s.firstPos, s.polePos, s.tipPos)
              : Math3D.getNormalWithPoints(s.tipPos, s.polePos, s.firstPos),
          getCustomNodeUp: (s, n) => s.dirPlaneNormal
        };
        return new FABRIK_IK(
          isRight ? j.IK_LEG_R : j.IK_LEG_L,
          obn[characterDeafultName],
          data,
        );
      case LizardJointType.IK_TAIL:
        data = {
          nodes: [
            new IkNode(obn[j.HIP]),
            new IkNode(obn[j.TAIL_01]),
            new IkNode(obn[j.TAIL_02]),
            new IkNode(obn[j.TAIL_03]),
            new IkNode(obn[j.TAIL_04]),
            new IkNode(obn[j.TAIL_05]),
            new IkNode(obn[j.TAIL_06]),
            new IkNode(obn[j.TAIL_07]),
            new IkNode(obn[j.TAIL_08]),
            new IkNode(obn[j.TAIL_09]),
            new IkNode(obn[j.TAIL_10]),
            new IkNode(obn[j.TAIL_11]),
            new IkNode(obn[j.TAIL_12]),
            new IkNode(obn[j.TAIL_13]),
            new IkNode(obn[j.TAIL_14]),
            new IkNode(obn[j.TAIL_15]),
            new IkNode(obn[j.TAIL_16]),
          ].filter(e => !!e.obj),
          allowFallBackAlg: false,
          startIndex: 1,
          stickToInitial: true,
          extendTipBy: 0,
          isRight: false,
          numberIterations: 16,
          getRootUp: s => s.root.obj.v.up, // get root up
          getTipUp: s => s.tip.obj.localToWorldVec(s.tip.obj.v.up, s.root.obj),
          getPoleTargetPosition: d =>
            FABRIK_IK.getPolePos(
              d,
              0.5
            ),
          getCustomNodeUp: (s, n) => s.rootUp
        };
        return new FABRIK_IK(
          j.IK_TAIL,
          obn[characterDeafultName],
          data,
        );
    }
    throwError(`InverseKinematicsFactory error, unknown IK type "${type}"`);
  }
}
/**
 * Lizard character object
 */
export class LizardCharacter extends BaseCharacter implements ICharacter {
  private readonly _config: ICharacterConfig;
  private _eyeL: Object3D;
  private _eyeR: Object3D;
  private _head: Object3D;
  private _neck: Object3D;
  private _hip: Object3D;
  private _spine0: Object3D;
  private _chest: Object3D;
  private _spine: InverseKinematicsChain;
  private _armL: InverseKinematicsChain;
  private _armR: InverseKinematicsChain;
  private _legL: InverseKinematicsChain;
  private _legR: InverseKinematicsChain;
  private _tail: InverseKinematicsChain;
  private _isInitialized: boolean;
  constructor(
    public readonly resources: IResourcesManager,
    public readonly data: CharacterData
  ) {
    const summary = resources.getFirstObjectByNameOrPath(data.path);
    if (!summary) throw new Error(`Cannot find path: "${data.path}"`);
    super(data, summary);
  }
  get label(): string { return 'Lizard'; }
  /**
   * spine IK chain
   */
  get spine(): InverseKinematicsChain {
    return this._spine;
  }
  /**
   * left arm IK chain
   */
  get armL(): InverseKinematicsChain {
    return this._armL;
  }
  /**
   * right arm IK chain
   */
  get armR(): InverseKinematicsChain {
    return this._armR;
  }
  /**
   * left leg IK chain
   */
  get legL(): InverseKinematicsChain {
    return this._legL;
  }
  /**
   * right leg IK chain
   */
  get legR(): InverseKinematicsChain {
    return this._legR;
  }
  /**
   * right leg IK chain
   */
  get tail(): InverseKinematicsChain {
    return this._tail;
  }
  /**
   * head joint
   */
  get head(): Object3D {
    return this._head;
  }
  /**
   * neck joint
   */
  get neck(): Object3D {
    return this._neck;
  }
  /**
   * hip joint
   */
  get hip(): Object3D {
    return this._hip;
  }
  /**
   * eyeL joint
   */
  get eyeL(): Object3D {
    return this._eyeL;
  }
  /**
   * eyeR joint
   */
  get eyeR(): Object3D {
    return this._eyeR;
  }
  /**
   * spine0 joint
   */
  get spine0(): Object3D {
    return this._spine0;
  }
  /**
   * chest joint
   */
  get chest(): Object3D {
    return this._chest;
  }
  /**
   * Gets whether is initialized
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }
  async initializeAsync(): Promise<void> {
    super.createJoints(this.resources);

    await Dbg.initializeAsync();

    // check for externally supplied inverse kinematics factory and if none are supplied
    // then add default one
    const ikFactory = super.getIkFactory(
      LizardExtenderName.inverseKinematicsFactory,
      () => new LizardInverseKinematicsFactory(),
    );
    const j = LizardJointType;

    this._jointsByName[characterDeafultName] = this;
    this._objectsById[this.identifier] = this;

    this._head = super.getJoint(j.HEAD);
    this._neck = super.getJoint(j.NECK);
    this._eyeL = super.getJoint(j.EYE_L);
    this._eyeR = super.getJoint(j.EYE_R);
    this._hip = super.getJoint(j.HIP);
    this._spine0 = super.getJoint(j.SPINE);
    this._chest = super.getJoint(j.CHEST);

    this._spine = super.createIkChain(ikFactory, j.IK_SPINE);
    this._tail = super.createIkChain(ikFactory, j.IK_TAIL);
    this._armL = super.createIkChain(ikFactory, j.IK_ARM_L);
    this._armR = super.createIkChain(ikFactory, j.IK_ARM_R);
    this._legL = super.createIkChain(ikFactory, j.IK_LEG_L);
    this._legR = super.createIkChain(ikFactory, j.IK_LEG_R);

    await super.initializeExtendersAsync();

    this._isInitialized = true;
  }
}
// --------- lizard model END ---------

// --------- service providers START ---------
/**
 * App events
 */
export enum AppEvent {
  dragTargetEnds = 'dragTargetEnds',
  dragTargetStarts = 'dragTargetStarts',
}
/**
 * Lizard factory - extends character factory.
 * Instantiate camera and touch controllers inside
 */
export class LizardFactory extends CharacterFactory {
  readonly camera: CameraController;
  readonly touch: TouchController;
  constructor() {
    super();
    this.camera = new CameraController(this);
    this.touch = new TouchController(this);
  }
  // override base method to create our character
  protected async createCharacterAsync(resources: IResourcesManager, data: CharacterData): Promise<ICharacter> {
    const lizard = new LizardCharacter(resources, data);
    await lizard.initializeAsync();
    return lizard;
  }
  get lizzy(): LizardCharacter {
    return this.characters[0] as LizardCharacter;
  }
  async initializeAsync(): Promise<void> {
    await super.initializeAsync();
    await this.camera.initializeAsync();
    await this.touch.initializeAsync();
  }
}
/**
 * Camera controller service provider
 */
export class CameraController implements IInitAsync {
  private _cameraPos = V3.createPermanent();
  constructor(readonly factory: LizardFactory) { }
  async initializeAsync(): Promise<void> {
    // find Camera object
    const camObj = this.factory.resources.getFirstObjectByName("Camera").obj;
    // create new local empty object
    const camTarget = await S.create("SceneObject", { "name": "CamTarget" });
    // subscribe for updates of camera target position, they will be stored in this._cameraPos
    this._cameraPos.updateAsPositionFromReactive_(camTarget.transform);
    const lz = this.factory.lizzy;
    const lizardParent = await lz.obj.getParent();
    // set the camera target to be child of the character parent, i.e. be sibling of character
    lizardParent.addChild(camTarget);
    // reactively attach world position for the camera object to the world position of camera target
    // this way we can use camera target as indicator where camera is in local space
    camTarget.worldTransform.position = camObj.worldTransform.position;
  }
  get pos(): V3 { return this._cameraPos.clone(); }
}
/**
 * Touch controller service provider
 */
export class TouchController implements IInitAsync {
  private _camRay: Ray = new Ray(V3.createPermanent(), V3.createPermanent());
  private _target: ObjWrap;
  private _touchPos = V3.createPermanent();
  private _targetBobbing: Behavior;
  constructor(readonly factory: LizardFactory) {
    // subscribe for drag target events
    subscribe(AppEvent.dragTargetStarts, this.onDragTargetStarts.bind(this));
    subscribe(AppEvent.dragTargetEnds, this.onDragTargetEnds.bind(this));
  }
  async initializeAsync(): Promise<void> {
    // get reference to lizard
    const lz = this.factory.lizzy;
    // get reference to known objects: Camera and target
    this._target = new ObjWrap("target", this.factory.resources.getFirstObjectByName("target"));

    invoke(AppEvent.dragTargetEnds);

    // create temp target objects for touch psition
    const touchTarget = await S.create("SceneObject", { "name": "TouchTarget" });

    const lizardParent = await lz.obj.getParent();
    // add temp object as childrean to the lizard parent so that referencing them will be in local space
    await lizardParent.addChild(touchTarget);

    const subs = new SubXYZW();

    TG.onPan(this._target.obj).subscribe((gesture: PanGesture) => {
      // on pan (drag) gesture attach world position of the touch point
      // with the touch target similarly to what we did with the camera before
      invoke(AppEvent.dragTargetStarts);

      subs.unsubscribe(); // unsubscribe to prevent memory leak
      this.monitorTouchPosition(gesture.location, touchTarget, subs);
      // keep updating target position when finger is moving on the screen
      const updater = playEndless(() => this.updateLookAtTargetPosition(), objPool);

      // when touching the screen ends, stop updating and unsubscibe from changes
      subs.w =
        gesture.state.eq('ENDED').monitor().subscribe(() => {
          updater.finish();
          subs.unsubscribe();
          invoke(AppEvent.dragTargetEnds);
        });

      P.inputs.setBoolean('hasPannedTarget', true);
    });
  }
  get target(): Object3D { return this._target; }
  private monitorTouchPosition(loc: Point2D | Vec2Signal, touchTarget: SceneObjectBase, subs: SubXYZW = null): void {
    const gestureLocationAsSignal = R.point2d(loc.x, loc.y);
    touchTarget.worldTransform.position = S.unprojectToFocalPlane(gestureLocationAsSignal);
    this._touchPos.updateAsPositionFromReactive_(touchTarget.transform, subs);
  }
  private updateLookAtTargetPosition(): void {
    const point = this.getTargetPos(this._touchPos);
    if (point) this._target.pos = this._target.pos.moveTo(point, 0.1);
    this._target.rot = lookAt(this._target.pos.dirTo(this.factory.camera.pos), V3.up);
  }
  private onDragTargetStarts(): void {
    if (this._targetBobbing) this._targetBobbing.finish();
  }
  private getTargetPos(refPos: V3): V3 {
    const camPos = this.factory.camera.pos;
    // set camera ray to start from camera
    this._camRay.origin = camPos;
    const camPosMag = camPos.magnitude;
    // point ray to the reference point
    this._camRay.lookAt(refPos);
    // find horizontal direction of the camera
    const horzDirToCam = camPos.setY(0).normalized;
    // find radius of the sphere
    const r = Math.min(TARGET_RADIUS_AROUND_LIZ, camPosMag / 3);
    // move sphere center r length towards the camera
    const pivot = horzDirToCam.by(r);
    // try intersect with the sphere
    let point = this._camRay.intersectWithSphere(pivot, r);
    if(!point){
      // if that fails try intersect with plane in the sphere center
      point = this._camRay.intersectWithPlane(horzDirToCam, pivot);
    }
    return point;
  }
  private onDragTargetEnds(): void {
    const tarPos = this._target.pos.permanent;

    // once target dragging is over start bobbing animation
    this._targetBobbing = playCycle(2, (x, i, b) => {
      tarPos.setFrom_(this.getTargetPos(tarPos));
      // bob target up and down
      const pos = tarPos.addUp(0.05 * sinLimitX01(x + i));
      this._target.pos = pos;
      // make sure target always faces camera
      this._target.rot = lookAt(pos.dirTo(this.factory.camera.pos), V3.up);
    }, objPool);
  }
}
// --------- service providers END ---------
// --------- debug utility START ---------
/**
 * Debug utility.
 * To use it enable visibility on "cube" object.
 * For example drag the cube object to character tail root (Root_M) then use this code to have it show pole target
 * @example
 * ```ts
 * // inside MainController.initialize()
 * const lz = this.factory.lizzy;
 * this.playEndless(() => {
 *  Dbg.cube.pos = lz.tail.pole.pos;
 * });
 * ```
 * Or to show tail tip
 * ```ts
 * // inside MainController.initialize()
 * const lz = this.factory.lizzy;
 * this.playEndless(() => {
 *  Dbg.cube.pos = lz.tail.pos;
 * });
 * ```
 */
export class Dbg {
  private static _logLines: any[];
  static async initializeAsync(): Promise<void> {
    const [cube] = await Promise.all([
      S.root.findFirst('cube')
    ]);

    Dbg.setCube(cube);
  }
  public static mark1 = 0;
  private static _cube: ObjWrap;
  static get cube(): ObjWrap {
    return Dbg._cube;
  }
  static setCube(obj: SceneObjectBase): void {
    Dbg._cube = new ObjWrap('Dbg_cube', ObjSummary.create(obj));
  }

  static logVars(...variables: any[]): void {
    if (!Dbg._logLines) Dbg._logLines = [];
    Dbg._logLines.push(variables.map(e => e.toString()).join('\t'));
  }
  static printAndClearLogs(prefix = ''): void {
    if (!Dbg._logLines) return;
    const out = Dbg._logLines.join('\n');
    Dbg._logLines = null;
    D.log(prefix + out);
  }
  static onLengthPrintAndClearLogs(len: number, prefix = ''): boolean {
    if (!Dbg._logLines) return false;
    if (Dbg._logLines.length >= len) {
      Dbg.printAndClearLogs(prefix || '');
      return true;
    }
    return false;
  }
}
// --------- debug utility END ---------
