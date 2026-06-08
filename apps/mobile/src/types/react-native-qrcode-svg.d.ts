declare module 'react-native-qrcode-svg' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  interface QRCodeProps {
    value?: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    logo?: { uri: string };
    logoSize?: number;
    logoBackgroundColor?: string;
    logoMargin?: number;
    quietZone?: number;
    enableLinearGradient?: boolean;
    linearGradient?: string[];
    getRef?: (ref: unknown) => void;
    ecl?: 'L' | 'M' | 'Q' | 'H';
    style?: ViewStyle;
  }

  export default class QRCode extends Component<QRCodeProps> {}
}
