import { useCallback, useState } from "react";
import useEventListener from "./useEventListener";

const useKeyPress = (targetKey: string, action: () => void) => {
  const [keyPressed, setKeyPressed] = useState(false);

  const onKeyDown = useCallback(
    ({ key }) => {
      if (key === targetKey) {
        setKeyPressed(true);
        action();
      }
    },
    [action, targetKey, setKeyPressed]
  );

  const onKeyUp = useCallback(
    ({ key }) => {
      if (key === targetKey) {
        setKeyPressed(false);
      }
    },
    [targetKey, setKeyPressed]
  );

  useEventListener("keydown", onKeyDown);
  useEventListener("keyup", onKeyUp);

  return [keyPressed, targetKey];
};

export default useKeyPress;
