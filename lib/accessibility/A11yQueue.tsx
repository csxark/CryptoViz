import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';

/**
 * Enterprise Accessibility Announcement Queue System
 * 
 * Screen readers often drop or overwrite announcements if `aria-live` regions
 * are updated too rapidly (e.g., during rapid cipher step animations).
 * This module implements a robust, priority-based queuing architecture to ensure
 * all critical auditory feedback is delivered sequentially without dropping frames.
 */

// --- Abstract Interfaces & Types ---

export type A11yPriority = 'assertive' | 'polite' | 'low';

export interface A11yMessage {
  id: string;
  text: string;
  priority: A11yPriority;
  timestamp: number;
}

export interface IA11yQueueContext {
  announce: (text: string, priority?: A11yPriority) => void;
  clearQueue: () => void;
  isActive: boolean;
}

// --- Internal Queue Engine ---

/**
 * Manages the sequential dispatch of accessibility messages.
 * Uses a singleton pattern internally to prevent React re-render cycles
 * from interrupting the active reading state of the screen reader.
 */
class AnnouncementEngine {
  private queue: A11yMessage[] = [];
  private isReading = false;
  private currentTimeout: NodeJS.Timeout | null = null;
  
  // Standard screen reader reading speed fallback (~150 words per minute)
  // We use this to estimate how long a string of text will take to be read.
  private calculateReadTimeMs(text: string): number {
    const wordCount = text.split(/\s+/).length;
    const msPerWord = 400; // 400ms per word allows for clear enunciation
    return Math.max(wordCount * msPerWord, 1000); // Minimum 1 second lock
  }

  public enqueue(message: A11yMessage, onRead: (msg: A11yMessage) => void) {
    if (message.priority === 'assertive') {
      // Assertive messages jump the queue and interrupt polite reading
      this.queue.unshift(message);
      this.forceNext(onRead);
    } else {
      this.queue.push(message);
      this.processQueue(onRead);
    }
  }

  public clear() {
    this.queue = [];
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.isReading = false;
  }

  private processQueue(onRead: (msg: A11yMessage) => void) {
    if (this.isReading || this.queue.length === 0) return;

    this.isReading = true;
    const nextMessage = this.queue.shift();

    if (nextMessage) {
      onRead(nextMessage);
      
      const readTime = this.calculateReadTimeMs(nextMessage.text);
      this.currentTimeout = setTimeout(() => {
        this.isReading = false;
        this.processQueue(onRead);
      }, readTime);
    } else {
      this.isReading = false;
    }
  }

  private forceNext(onRead: (msg: A11yMessage) => void) {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
    this.isReading = false;
    this.processQueue(onRead);
  }
}

// --- React Context & Provider ---

const A11yQueueContext = createContext<IA11yQueueContext | null>(null);

interface A11yProviderProps {
  children: ReactNode;
}

export const A11yProvider: React.FC<A11yProviderProps> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');
  const [isActive, setIsActive] = useState(false);
  
  const engineRef = useRef(new AnnouncementEngine());

  const onRead = useCallback((msg: A11yMessage) => {
    setIsActive(true);
    
    // Toggle between states to force screen readers to re-read identical consecutive text
    if (msg.priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(msg.text), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(msg.text), 50);
    }
    
    setTimeout(() => setIsActive(false), 500); // Visual activity indicator duration
  }, []);

  const announce = useCallback((text: string, priority: A11yPriority = 'polite') => {
    if (!text.trim()) return;
    
    const message: A11yMessage = {
      id: Math.random().toString(36).substring(7),
      text,
      priority,
      timestamp: Date.now(),
    };
    
    engineRef.current.enqueue(message, onRead);
  }, [onRead]);

  const clearQueue = useCallback(() => {
    engineRef.current.clear();
    setPoliteMessage('');
    setAssertiveMessage('');
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current.clear();
    };
  }, []);

  return (
    <A11yQueueContext.Provider value={{ announce, clearQueue, isActive }}>
      {children}
      
      {/* Invisible DOM injection for Assistive Technologies */}
      <div 
        className="sr-only" 
        data-testid="a11y-polite-region"
        aria-live="polite" 
        aria-atomic="true" 
        aria-relevant="additions text"
      >
        {politeMessage}
      </div>
      
      <div 
        className="sr-only" 
        data-testid="a11y-assertive-region"
        aria-live="assertive" 
        aria-atomic="true" 
        aria-relevant="additions text"
      >
        {assertiveMessage}
      </div>
    </A11yQueueContext.Provider>
  );
};

// --- Custom Hooks ---

/**
 * Hook to access the enterprise A11y Queue.
 * Component must be wrapped in <A11yProvider>.
 */
export const useA11yAnnouncer = (): IA11yQueueContext => {
  const context = useContext(A11yQueueContext);
  if (!context) {
    // Graceful fallback to console warn if used outside provider, 
    // ensuring we don't break the application runtime.
    console.warn('useA11yAnnouncer must be used within an A11yProvider. Falling back to dummy implementation.');
    return {
      announce: (t, p) => console.log(`[A11y Missing Provider] ${p}: ${t}`),
      clearQueue: () => {},
      isActive: false
    };
  }
  return context;
};
