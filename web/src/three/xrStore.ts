import { createXRStore } from "@react-three/xr";
import { useEffect, useState } from "react";

export const twinXrStore = createXRStore({
  controller: false,
  hand: false,
  transientPointer: false,
  gaze: false,
  hitTest: true,
  domOverlay: false,
  planeDetection: true,
  layers: false,
});

export function useArSupported(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const xr = navigator.xr;
    if (!xr?.isSessionSupported) {
      setSupported(false);
      return;
    }
    xr.isSessionSupported("immersive-ar").then(setSupported).catch(() => setSupported(false));
  }, []);

  return supported;
}

export function useInArSession(): boolean {
  const [inAr, setInAr] = useState(false);

  useEffect(
    () =>
      twinXrStore.subscribe((state) => {
        setInAr(state.mode === "immersive-ar" && state.session != null);
      }),
    [],
  );

  return inAr;
}

export function exitArSession() {
  twinXrStore.getState().session?.end();
}
