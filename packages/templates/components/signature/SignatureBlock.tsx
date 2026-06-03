import React from 'react';
import { View, Text, Image } from '@react-pdf/renderer';

interface SignatureBlockProps {
  imageUrl: string;
  name: string;
  role: string;
  date: string;
  width?: number;
}

const SignatureBlock: React.FC<SignatureBlockProps> = ({ imageUrl, name, role, date, width = 150 }) => (
  <View style={{ marginTop: 20, alignItems: 'center' }}>
    {imageUrl ? (
      <Image
        src={imageUrl}
        style={{ width, height: Math.round(width * 0.4), objectFit: 'contain', marginBottom: 4 }}
      />
    ) : (
      <View style={{ width, height: Math.round(width * 0.4), marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#000' }} />
    )}
    <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 4 }}>{name}</Text>
    <Text style={{ fontSize: 9, color: '#555' }}>{role}</Text>
    <Text style={{ fontSize: 8, color: '#888', marginTop: 2 }}>{date}</Text>
  </View>
);

export default SignatureBlock;