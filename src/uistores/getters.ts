import { extractUserStreams } from '@onlineclass/utils/stream';
import { EduStreamUI } from '@onlineclass/utils/stream/struct';
import { EduClassroomConfig, EduRoleTypeEnum, EduStream } from 'agora-edu-core';
import { AgoraRteVideoSourceType } from 'agora-rte-sdk';
import { computed } from 'mobx';
import { computedFn } from 'mobx-utils';
import { OnlineclassUIStore } from '.';

export class Getters {
  constructor(private _classroomUIStore: OnlineclassUIStore) {}

  get boardApi() {
    return this._classroomUIStore.boardApi;
  }
  get chatApi() {
    return this._classroomUIStore.chatApi;
  }
  get eduTool() {
    return this._classroomUIStore.eduToolApi;
  }
  @computed
  get isGranted() {
    return this._classroomUIStore.boardApi.granted;
  }

  get roomName() {
    return EduClassroomConfig.shared.sessionInfo.roomName;
  }
  get roomUuid() {
    return EduClassroomConfig.shared.sessionInfo.roomUuid;
  }

  get isHost() {
    return EduClassroomConfig.shared.sessionInfo.role === EduRoleTypeEnum.teacher;
  }

  get isStudent() {
    return EduClassroomConfig.shared.sessionInfo.role === EduRoleTypeEnum.student;
  }
  @computed
  get localUser() {
    return this._classroomUIStore.classroomStore.userStore.localUser;
  }
  @computed
  get videoStreams() {
    const { streamByUserUuid, streamByStreamUuid } =
      this._classroomUIStore.classroomStore.streamStore;
    const videoStreams = extractUserStreams(
      this._classroomUIStore.classroomStore.userStore.users,
      streamByUserUuid,
      streamByStreamUuid,
      [AgoraRteVideoSourceType.Camera, AgoraRteVideoSourceType.ScreenShare],
    );
    return videoStreams;
  }
  @computed
  get videoUIStreams() {
    return Array.from(this.videoStreams).map((stream) => new EduStreamUI(stream));
  }
  @computed
  get cameraStreams() {
    const { streamByUserUuid, streamByStreamUuid } =
      this._classroomUIStore.classroomStore.streamStore;
    const cameraStreams = extractUserStreams(
      this._classroomUIStore.classroomStore.userStore.users,
      streamByUserUuid,
      streamByStreamUuid,
      [AgoraRteVideoSourceType.Camera],
    );
    return cameraStreams;
  }

  @computed
  get cameraUIStreams() {
    return Array.from(this.cameraStreams).map((stream) => new EduStreamUI(stream));
  }

  @computed
  get screenShareUIStream() {
    const streamUuid = this._classroomUIStore.classroomStore.roomStore
      .screenShareStreamUuid as string;
    const stream =
      this._classroomUIStore.classroomStore.streamStore.streamByStreamUuid.get(streamUuid);
    return stream ? new EduStreamUI(stream) : null;
  }

  userCameraStreamByUserUuid = computedFn((userUuid: string) => {
    const cameraStreams: EduStream[] = [];
    this.cameraStreams.forEach((stream) => {
      if (stream.fromUser.userUuid === userUuid) cameraStreams.push(stream);
    });
    return cameraStreams[0];
  });

  get layoutReady() {
    return this._classroomUIStore.layoutUIStore.layoutReady;
  }

  get isBoardWidgetActive() {
    return this._classroomUIStore.widgetUIStore.widgetInstanceList.some((widget) => {
      return widget.widgetName === 'netlessBoard';
    });
  }

  get viewportBoundaries() {
    return this._classroomUIStore.layoutUIStore.viewportBoundaries;
  }
}
