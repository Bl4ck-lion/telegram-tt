import { RefObject } from 'react';
import { getDispatch } from '../../../lib/teact/teactn';

import { MessageListType } from '../../../global/types';

import { IS_ANDROID, IS_SINGLE_COLUMN_LAYOUT } from '../../../util/environment';
import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';
import useBackgroundMode from '../../../hooks/useBackgroundMode';

const INTERSECTION_THROTTLE_FOR_MEDIA = IS_ANDROID ? 1000 : 350;
const INTERSECTION_MARGIN_FOR_MEDIA = IS_SINGLE_COLUMN_LAYOUT ? 300 : 500;
const INTERSECTION_THROTTLE_FOR_READING = 150;

export default function useMessageObservers(
  type: MessageListType,
  containerRef: RefObject<HTMLDivElement>,
  memoFirstUnreadIdRef: { current: number | undefined },
) {
  const { markMessageListRead, markMessagesRead } = getDispatch();

  const {
    observe: observeIntersectionForMedia,
  } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE_FOR_MEDIA,
    margin: INTERSECTION_MARGIN_FOR_MEDIA,
  });

  const {
    observe: observeIntersectionForReading, freeze: freezeForReading, unfreeze: unfreezeForReading,
  } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE_FOR_READING,
    noAutoFreeze: true,
  }, (entries) => {
    if (type !== 'thread') {
      return;
    }

    let maxId = 0;
    const mentionIds: number[] = [];

    entries.forEach((entry) => {
      const { isIntersecting, target } = entry;

      if (!isIntersecting) {
        return;
      }

      const { dataset } = target as HTMLDivElement;

      const messageId = Number(dataset.lastMessageId || dataset.messageId);
      if (messageId > maxId) {
        maxId = messageId;
      }

      if (dataset.hasUnreadMention) {
        mentionIds.push(messageId);
      }
    });

    if (memoFirstUnreadIdRef.current && maxId >= memoFirstUnreadIdRef.current) {
      markMessageListRead({ maxId });
    }

    if (mentionIds.length) {
      markMessagesRead({ messageIds: mentionIds });
    }
  });

  useBackgroundMode(freezeForReading, unfreezeForReading);

  const { observe: observeIntersectionForAnimatedStickers } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE_FOR_MEDIA,
  });

  return {
    observeIntersectionForMedia,
    observeIntersectionForReading,
    observeIntersectionForAnimatedStickers,
  };
}
