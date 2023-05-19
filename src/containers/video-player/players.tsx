import { useStore } from '@onlineclass/utils/hooks/use-store';
import { observer } from 'mobx-react';
import { useEffect, useRef } from 'react';
import { Avatar } from '@components/avatar';
import { getLaunchOptions } from '@onlineclass/utils/launch-options-holder';

export const LocalVideoPlayer = observer(() => {
  const { deviceSettingUIStore } = useStore();
  const videoRef = useRef<HTMLDivElement>(null);
  const { userName } = getLaunchOptions();

  useEffect(() => {
    if (videoRef.current) {
      deviceSettingUIStore.setupLocalVideo(
        videoRef.current,
        deviceSettingUIStore.isLocalMirrorEnabled,
      );
    }
  }, [deviceSettingUIStore.isLocalMirrorEnabled]);

  return (
    <div className="fcr-video-player-wrapper">
      <div ref={videoRef} className="fcr-video-player" />
      <div className="fcr-video-player__placeholder">
        <Avatar size={80} textSize={24} nickName={userName} />
      </div>
    </div>
  );
});

export const RemoteVideoPlayer = observer(() => {
  return <div />;
});
