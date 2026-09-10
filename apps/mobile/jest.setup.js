// Set React Native globals
global.__DEV__ = true;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock expo-router
const MockUseLocalSearchParams = () => ({});
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  }),
  useLocalSearchParams: () => MockUseLocalSearchParams(),
  useFocusEffect: (cb: () => void | (() => void)) => {
    require('react').useEffect(() => cb(), []);
  },
  Link: 'Link',
  Stack: { Screen: 'Screen' },
  Tabs: 'Tabs',
}));

// Mock expo-av (notification alert sound).
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: { createAsync: jest.fn() },
  },
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock the @expo/vector-icons/Ionicons subpath (used by most screens as a
// default import). This avoids Jest trying to parse the package's raw TS source.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const MockIonicons = React.forwardRef((props: any, ref: any) =>
    React.createElement('Ionicons', { ...props, ref }),
  );
  MockIonicons.displayName = 'Ionicons';
  return MockIonicons;
});

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Path: 'Path',
  Circle: 'Circle',
  Line: 'Line',
  Text: 'Text',
}));

// Mock react-native-safe-area-context entirely to avoid the native TurboModule
// invariant ("TurboModuleRegistry: ... NativePlatformConstantsAndroid") in jsdom.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
  const FRAME = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, ...props }: any) => React.createElement('SafeAreaView', props, children),
    SafeAreaInsetsContext: {
      Consumer: ({ children }: any) => children(INSETS),
    },
    SafeAreaFrameContext: {
      Consumer: ({ children }: any) => children(FRAME),
    },
    useSafeAreaInsets: () => INSETS,
    useSafeAreaFrame: () => FRAME,
    initialWindowMetrics: { frame: FRAME, insets: INSETS },
  };
});

// Mock react-native-gesture-handler (some screens indirectly import it).
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureHandlerRootView: ({ children, ...props }: any) => React.createElement('View', props, children),
    ...jest.requireActual('react-native-gesture-handler'),
  };
});
