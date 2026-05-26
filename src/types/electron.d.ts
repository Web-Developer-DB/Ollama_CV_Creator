export type DesktopRuntimeInfo = {
  platform: NodeJS.Platform;
  isElectron: true;
};

export type DesktopApi = {
  runtime: DesktopRuntimeInfo;
};

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}

export {};
