import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
  pem: string;
}

export interface SignedData {
  signature: string;
  certificate: string;
  algorithm: string;
  timestamp: Date;
}

export interface VerificationResult {
  valid: boolean;
  certificate?: CertificateInfo;
  error?: string;
}

@Injectable()
export class PkiService {
  private readonly logger = new Logger(PkiService.name);
  private privateKey: crypto.KeyObject | null = null;
  private certificate: string | null = null;
  private caChain: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.loadKeys();
  }

  private loadKeys(): void {
    try {
      const privateKeyPath = this.configService.get<string>('PKI_PRIVATE_KEY_PATH');
      const certificatePath = this.configService.get<string>('PKI_CERTIFICATE_PATH');
      const caChainPath = this.configService.get<string>('PKI_CA_CHAIN_PATH');

      if (privateKeyPath && fs.existsSync(privateKeyPath)) {
        const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
        this.privateKey = crypto.createPrivateKey({
          key: privateKeyPem,
          format: 'pem',
        });
        this.logger.log('Private key loaded successfully');
      } else {
        this.logger.warn('PKI_PRIVATE_KEY_PATH not set or file not found - using env fallback');
        this.loadFromEnv();
      }

      if (certificatePath && fs.existsSync(certificatePath)) {
        this.certificate = fs.readFileSync(certificatePath, 'utf8');
        this.logger.log('Certificate loaded successfully');
      }

      if (caChainPath && fs.existsSync(caChainPath)) {
        this.caChain = fs.readFileSync(caChainPath, 'utf8');
        this.logger.log('CA chain loaded successfully');
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to load PKI keys: ${(error as Error).message}`);
    }
  }

  private loadFromEnv(): void {
    const privateKeyPem = this.configService.get<string>('PKI_PRIVATE_KEY');
    const certificatePem = this.configService.get<string>('PKI_CERTIFICATE');
    const caChainPem = this.configService.get<string>('PKI_CA_CHAIN');

    if (privateKeyPem) {
      try {
        this.privateKey = crypto.createPrivateKey({
          key: privateKeyPem,
          format: 'pem',
        });
        this.logger.log('Private key loaded from env');
      } catch (e) {
        this.logger.error('Failed to load private key from env');
      }
    }

    if (certificatePem) {
      this.certificate = certificatePem;
    }

    if (caChainPem) {
      this.caChain = caChainPem;
    }
  }

  isReady(): boolean {
    return this.privateKey !== null && this.certificate !== null;
  }

  getCertificateInfo(): CertificateInfo | null {
    if (!this.certificate) return null;

    try {
      const cert = new crypto.X509Certificate(this.certificate);
      const fingerprint = cert.fingerprint256.replace(/:/g, '').toLowerCase();

      return {
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        fingerprint,
        pem: this.certificate,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to parse certificate: ${(error as Error).message}`);
      return null;
    }
  }

  sign(data: string): SignedData {
    if (!this.privateKey) {
      throw new Error('Private key not loaded - PKI not configured');
    }

    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();

    const signature = sign.sign(this.privateKey).toString('base64');

    return {
      signature,
      certificate: this.certificate || '',
      algorithm: 'RSA-SHA256',
      timestamp: new Date(),
    };
  }

  verify(data: string, signature: string, certificatePem: string): VerificationResult {
    try {
      const cert = new crypto.X509Certificate(certificatePem);
      const publicKey = cert.publicKey;

      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();

      const isValid = verify.verify(publicKey, Buffer.from(signature, 'base64'));

      if (!isValid) {
        return { valid: false, error: 'Invalid signature' };
      }

      const now = new Date();
      const validFrom = new Date(cert.validFrom);
      const validTo = new Date(cert.validTo);
      if (now < validFrom || now > validTo) {
        return { valid: false, error: 'Certificate expired or not yet valid' };
      }

      const fingerprint = cert.fingerprint256.replace(/:/g, '').toLowerCase();

      return {
        valid: true,
        certificate: {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.validFrom,
          validTo: cert.validTo,
          fingerprint,
          pem: certificatePem,
        },
      };
    } catch (error: unknown) {
      return { valid: false, error: `Verification failed: ${(error as Error).message}` };
    }
  }

  verifyWithStoredCert(data: string, signature: string): VerificationResult {
    if (!this.certificate) {
      return { valid: false, error: 'No certificate loaded' };
    }
    return this.verify(data, signature, this.certificate);
  }

  getCaChain(): string | null {
    return this.caChain;
  }

  createVerificationUrl(token: string): string {
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${baseUrl}/verify/${token}`;
  }

  generateQrToken(data: object): string {
    const payload = JSON.stringify(data);
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    return `${payload}.${hash.substring(0, 16)}`;
  }

  parseQrToken(token: string): { data: object; valid: boolean } {
    try {
      const [payload, hash] = token.split('.');
      const data = JSON.parse(payload);
      const expectedHash = crypto.createHash('sha256').update(payload).digest('hex').substring(0, 16);
      return { data, valid: hash === expectedHash };
    } catch {
      return { data: {}, valid: false };
    }
  }
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  fingerprint: string;
  pem: string;
}

export interface SignedData {
  signature: string;
  certificate: string;
  algorithm: string;
  timestamp: Date;
}

export interface VerificationResult {
  valid: boolean;
  certificate?: CertificateInfo;
  error?: string;
}
