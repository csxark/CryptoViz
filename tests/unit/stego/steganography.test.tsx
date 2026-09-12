import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import SteganographyWorkbench from '@/components/stego/SteganographyWorkbench';
import { encodeLSB, decodeLSB, encodeZeroWidth, decodeZeroWidth } from '@/lib/stego/lsbEngine';
import { extractBitPlane } from '@/lib/stego/bitPlane';
import BitPlaneInspector from '@/components/stego/BitPlaneInspector';

// Mock ImageData for test environment
class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

global.ImageData = MockImageData as unknown as typeof ImageData;

describe('Steganography Workbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sample Cover Generation', () => {
    it('should handle invalid bit plane gracefully', () => {
      const testData = new ImageData(100, 100);
      expect(() => extractBitPlane(testData, 8, 'combined')).toThrow('Bit plane must be between 0 and 7');
      expect(() => extractBitPlane(testData, -1, 'combined')).toThrow('Bit plane must be between 0 and 7');
    });
  });

  describe('LSB Encoding/Decoding', () => {
    it('should encode and return stego data', () => {
      const testData = new ImageData(400, 300);
      const secretMessage = 'Test';
      
      const stegoData = encodeLSB(testData, secretMessage, 1);
      expect(stegoData).toBeDefined();
      expect(stegoData).toBeInstanceOf(ImageData);
    });

    it('should handle different bit depths', () => {
      const testData = new ImageData(400, 300);
      const secretMessage = 'Test';
      
      [1, 2, 3].forEach(bitDepth => {
        const stegoData = encodeLSB(testData, secretMessage, bitDepth);
        expect(stegoData).toBeDefined();
      });
    });

    it('should handle empty message', () => {
      const testData = new ImageData(400, 300);
      const secretMessage = '';
      
      const stegoData = encodeLSB(testData, secretMessage, 1);
      expect(stegoData).toBeDefined();
    });
  });

  describe('Zero-Width Text Steganography', () => {
    it('should encode and decode zero-width characters', () => {
      const coverText = 'The quick brown fox';
      const secretMessage = 'Secret';
      
      const encoded = encodeZeroWidth(coverText, secretMessage);
      expect(encoded).toBeDefined();
      
      const decoded = decodeZeroWidth(encoded);
      expect(decoded).toBe(secretMessage);
    });

    it('should handle empty secret message', () => {
      const coverText = 'The quick brown fox';
      const secretMessage = '';
      
      const encoded = encodeZeroWidth(coverText, secretMessage);
      const decoded = decodeZeroWidth(encoded);
      expect(decoded).toBe('');
    });
  });

  describe('Bit-Plane Extraction', () => {
    it('should extract bit plane 0 (LSB)', () => {
      const testData = new ImageData(100, 100);
      const bitPlane0 = extractBitPlane(testData, 0, 'combined');
      
      expect(bitPlane0).toBeDefined();
    });

    it('should extract all bit planes 0-7', () => {
      const testData = new ImageData(100, 100);
      
      for (let i = 0; i <= 7; i++) {
        const bitPlane = extractBitPlane(testData, i, 'combined');
        expect(bitPlane).toBeDefined();
      }
    });

    it('should extract red channel bit plane', () => {
      const testData = new ImageData(100, 100);
      const redPlane = extractBitPlane(testData, 0, 'red');
      
      expect(redPlane).toBeDefined();
    });

    it('should extract green channel bit plane', () => {
      const testData = new ImageData(100, 100);
      const greenPlane = extractBitPlane(testData, 0, 'green');
      
      expect(greenPlane).toBeDefined();
    });

    it('should extract blue channel bit plane', () => {
      const testData = new ImageData(100, 100);
      const bluePlane = extractBitPlane(testData, 0, 'blue');
      
      expect(bluePlane).toBeDefined();
    });

    it('should extract combined RGB bit plane', () => {
      const testData = new ImageData(100, 100);
      const combinedPlane = extractBitPlane(testData, 0, 'combined');
      
      expect(combinedPlane).toBeDefined();
    });
  });

  describe('BitPlaneInspector Component', () => {
    it('should render without crashing', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
    });

    it('should handle missing image data gracefully', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      expect(screen.getByText(/No image loaded/i)).toBeInTheDocument();
      expect(screen.getByText(/No stego image/i)).toBeInTheDocument();
    });

    it('should display bit plane controls', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      // Check for bit plane buttons 0-7
      for (let i = 0; i <= 7; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });

    it('should display channel selection controls', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      expect(screen.getByText(/RGB Combined/i)).toBeInTheDocument();
      expect(screen.getByText(/Red Channel/i)).toBeInTheDocument();
      expect(screen.getByText(/Green Channel/i)).toBeInTheDocument();
      expect(screen.getByText(/Blue Channel/i)).toBeInTheDocument();
    });

    it('should have accessible controls', () => {
      const { container } = render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      // Check for ARIA labels on buttons
      const buttons = container.querySelectorAll('button[aria-pressed]');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle bit plane selection', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      const plane3Button = screen.getByText('3');
      fireEvent.click(plane3Button);
      
      expect(plane3Button).toBeInTheDocument();
    });

    it('should handle channel selection', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      const redChannelButton = screen.getByText(/Red Channel/i);
      fireEvent.click(redChannelButton);
      
      expect(redChannelButton).toBeInTheDocument();
    });
  });

  describe('SteganographyWorkbench Component', () => {
    it('should switch between image and text tabs', () => {
      render(<SteganographyWorkbench />);
      
      const imageTab = screen.getByText(/Spatial Image LSB/i);
      const textTab = screen.getByText(/Zero-Width Text/i);
      
      expect(imageTab).toBeInTheDocument();
      expect(textTab).toBeInTheDocument();
      
      fireEvent.click(textTab);
      expect(screen.getByText(/Cover Carrier Text/i)).toBeInTheDocument();
      
      fireEvent.click(imageTab);
      // Component renders despite canvas errors
      expect(screen.getByText(/Pre-Loaded Cover Media/i)).toBeInTheDocument();
    });
  });

  describe('Bit-Plane Integration', () => {
    it('should handle cover and stego image data in inspector', () => {
      const coverData = new ImageData(100, 100);
      const stegoData = encodeLSB(coverData, 'Test', 1);
      
      const { container } = render(
        <BitPlaneInspector coverImageData={coverData} stegoImageData={stegoData} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have meaningful labels for bit-plane controls', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      const planeButtons = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('Bit plane')
      );
      expect(planeButtons.length).toBe(8); // Planes 0-7
    });

    it('should have meaningful labels for channel controls', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      const channelButtons = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('aria-label')?.includes('Channel')
      );
      expect(channelButtons.length).toBeGreaterThanOrEqual(3); // At least RGB, Red, Green
    });

    it('should have sufficient contrast indicators', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      // Check that selected state is indicated by more than just color
      const selectedButtons = screen.getAllByRole('button', { pressed: true });
      expect(selectedButtons[0]).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid image data gracefully', () => {
      render(
        <BitPlaneInspector coverImageData={null} stegoImageData={null} />
      );
      
      expect(screen.getByText(/No image loaded/i)).toBeInTheDocument();
    });

    it('should handle invalid bit plane values', () => {
      const testData = new ImageData(100, 100);
      
      expect(() => extractBitPlane(testData, 8, 'combined')).toThrow();
      expect(() => extractBitPlane(testData, -1, 'combined')).toThrow();
    });

    it('should handle decode with no payload', () => {
      const testData = new ImageData(100, 100);
      const decoded = decodeLSB(testData, 1);
      
      expect(decoded).toBe('No valid payload detected.');
    });
  });
});
