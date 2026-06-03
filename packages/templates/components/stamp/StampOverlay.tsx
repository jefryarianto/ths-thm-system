import React from 'react';
import { View, Image } from '@react-pdf/renderer';

interface StampOverlayProps {
  imageUrl: string;
  opacity?: number;
  size?: number;
  position?: 'top-right' | 'bottom-left' | 'center';
}

const StampOverlay: React.FC<StampOverlayProps> = ({ imageUrl, opacity = 0.35, size = 150, position = 'top-right' }) => {
  const positionStyles: Record<string, object> = {
    'top-right': { top: 40, right: 40 },
    'bottom-left': { bottom: 40, left: 40 },
    center: { top: '50%', left: '50%' },
  };

  return (
    <View style={{ position: 'absolute', ...positionStyles[position], opacity }}>
      {imageUrl && <Image src={imageUrl} style={{ width: size, height: size }} />}
    </View>
  );
};

export default StampOverlay;