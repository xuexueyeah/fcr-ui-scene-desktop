import {
  AgoraEduClassroomEvent,
  AgoraWidgetController,
  EduClassroomConfig,
  EduEventCenter,
  EduRoleTypeEnum,
} from 'agora-edu-core';
import { bound, Log, Logger } from 'agora-rte-sdk';
import { action, computed, IReactionDisposer, observable, runInAction, toJS } from 'mobx';

import { AgoraExtensionRoomEvent, AgoraExtensionWidgetEvent } from './events';
import { BoardConnectionState, BoardMountState, FcrBoardShape, FcrBoardTool } from './type';
import { getTheme } from '@onlineclass/utils/launch-options-holder';

@Log.attach({ proxyMethods: false })
export class Board {
  logger!: Logger;
  private _controller?: AgoraWidgetController;
  private _disposers: (IReactionDisposer | (() => void))[] = [];
  @observable
  grantedUsers = new Set<string>();
  @observable
  connState = BoardConnectionState.Disconnected;
  @observable
  mountState = BoardMountState.NotMounted;
  @observable
  undoSteps = 0;
  @observable
  redoSteps = 0;
  @observable
  pageIndex = 0;
  @observable
  pageCount = 0;
  @observable
  strokeColor = { r: 0, g: 115, b: 255 };
  @observable
  strokeWidth = 2;
  @observable
  selectedTool? = FcrBoardTool.Clicker;
  @observable
  selectedShape?: FcrBoardShape;

  @computed
  get connected() {
    return this.connState === BoardConnectionState.Connected;
  }

  @computed
  get mounted() {
    return this.mountState === BoardMountState.Mounted;
  }

  @computed
  get granted() {
    return this.hasPrivilege();
  }

  enable() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.ToggleBoard, true);
  }

  disable() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.ToggleBoard, false);
  }
  @bound
  addPage() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardAddPage, [{ after: true }]);
  }
  @bound
  removePage() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardRemovePage);
  }
  @bound
  gotoPage(index: number) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardGotoPage, [index]);
  }
  @bound
  undo() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardUndo);
  }
  @bound
  redo() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardRedo);
  }
  @bound
  clean() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardClean);
  }
  @bound
  putImageResource(url: string, pos?: { x: number; y: number; width: number; height: number }) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardPutImageResource, [url, pos]);
  }
  @bound
  putImageResourceIntoWindow(src: string) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardPutImageResourceIntoWindow, [src]);
  }
  @action
  selectTool(tool: FcrBoardTool) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardSelectTool, [tool]);
    this.selectedTool = tool;
    this.selectedShape = undefined;
  }
  @action
  drawShape(shape: FcrBoardShape) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardDrawShape, [
      shape,
      this.strokeWidth,
      this.strokeColor,
    ]);
    this.selectedShape = shape;
    this.selectedTool = undefined;
  }
  @bound
  grantPrivilege(userUuid: string, granted: boolean) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardGrantPrivilege, [userUuid, granted]);
  }
  @action
  changeStrokeWidth(strokeWidth: number) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardChangeStrokeWidth, [strokeWidth]);
    this.strokeWidth = strokeWidth;
  }
  @action
  changeStrokeColor(color: { r: number; g: number; b: number }) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardChangeStrokeColor, [color]);
    this.strokeColor = color;
  }

  @bound
  loadAttributes() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardLoadAttributes);
  }
  @bound
  saveAttributes() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardSaveAttributes, []);
  }
  @bound
  getSnapshotImageList() {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardGetSnapshotImageList, [
      getTheme().v2Block1,
    ]);
  }

  @bound
  setDelay(delay: number) {
    this._sendBoardCommandMessage(AgoraExtensionRoomEvent.BoardSetDelay, [delay]);
  }
  @bound
  hasPrivilege() {
    const { userUuid, role } = EduClassroomConfig.shared.sessionInfo;

    return (
      [EduRoleTypeEnum.teacher, EduRoleTypeEnum.assistant].includes(role) ||
      this.grantedUsers.has(userUuid)
    );
  }

  install(controller: AgoraWidgetController) {
    this._controller = controller;
    controller.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardGrantedUsersUpdated,
      onMessage: this._handleGrantedUpdate,
    });
    controller.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardSnapshotImageReceived,
      onMessage: this._handleSnapshotImageReceived,
    });
    controller.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardConnStateChanged,
      onMessage: this._handleConnStateChanged,
    });
    controller.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardMountStateChanged,
      onMessage: this._handleMountStateChanged,
    });
    controller.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardPageInfoChanged,
      onMessage: this._handlePageInfoChanged,
    });
    controller.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardRedoStepsChanged,
      onMessage: this._handleRedoStepsChanged,
    });
    controller.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardUndoStepsChanged,
      onMessage: this._handleUndoStepsChanged,
    });
    this._controller?.addBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.RequestGrantedList,
      onMessage: this._handleRequestGrantedList,
    });
    const { role } = EduClassroomConfig.shared.sessionInfo;
    if (role === EduRoleTypeEnum.student) {
      this._disposers.push(
        computed(() => this.grantedUsers).observe(async ({ newValue, oldValue }) => {
          const oldGranted = oldValue;
          const newGranted = newValue;
          const { userUuid } = EduClassroomConfig.shared.sessionInfo;

          if (newGranted.has(userUuid) && !oldGranted?.has(userUuid)) {
            EduEventCenter.shared.emitClasroomEvents(AgoraEduClassroomEvent.TeacherGrantPermission);
          }
          if (!newGranted.has(userUuid) && oldGranted?.has(userUuid)) {
            EduEventCenter.shared.emitClasroomEvents(
              AgoraEduClassroomEvent.TeacherRevokePermission,
            );
          }
        }),
      );
    }
  }

  uninstall() {
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardGrantedUsersUpdated,
      onMessage: this._handleGrantedUpdate,
    });
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardSnapshotImageReceived,
      onMessage: this._handleSnapshotImageReceived,
    });
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardConnStateChanged,
      onMessage: this._handleConnStateChanged,
    });
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardMountStateChanged,
      onMessage: this._handleMountStateChanged,
    });
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardPageInfoChanged,
      onMessage: this._handlePageInfoChanged,
    });
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardRedoStepsChanged,
      onMessage: this._handleRedoStepsChanged,
    });
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.BoardUndoStepsChanged,
      onMessage: this._handleUndoStepsChanged,
    });
    this._controller?.removeBroadcastListener({
      messageType: AgoraExtensionWidgetEvent.RequestGrantedList,
      onMessage: this._handleRequestGrantedList,
    });
    runInAction(() => {
      this.connState = BoardConnectionState.Disconnected;
      this.mountState = BoardMountState.NotMounted;
    });

    this._disposers.forEach((d) => d());
    this._disposers = [];
  }

  @bound
  private _handleRequestGrantedList(widgetId: string) {
    this._controller?.sendMessage(
      widgetId,
      AgoraExtensionRoomEvent.ResponseGrantedList,
      toJS(this.grantedUsers, { exportMapsAsObjects: false }),
    );
  }

  @action.bound
  private _handleRedoStepsChanged(steps: number) {
    this.redoSteps = steps;
  }

  @action.bound
  private _handleUndoStepsChanged(steps: number) {
    this.undoSteps = steps;
  }

  @action.bound
  private _handlePageInfoChanged(pageInfo: { showIndex: number; count: number }) {
    this.pageCount = pageInfo.count;
    this.pageIndex = pageInfo.showIndex;
  }

  @action.bound
  private _handleGrantedUpdate(grantedUsers: Set<string>) {
    this.grantedUsers = grantedUsers;
  }

  @action.bound
  private _handleSnapshotImageReceived(images: ImageData[]) {
    // 保存图片
  }

  @action.bound
  private _handleConnStateChanged(state: BoardConnectionState) {
    this.connState = state;
  }

  @action.bound
  private _handleMountStateChanged(state: BoardMountState) {
    this.mountState = state;
  }

  private _sendBoardCommandMessage(event: AgoraExtensionRoomEvent, args?: unknown) {
    if (this._controller) {
      this._controller.broadcast(event, args);
    } else {
      this.logger.warn('Widget controller not ready, cannot broadcast message');
    }
  }
}
