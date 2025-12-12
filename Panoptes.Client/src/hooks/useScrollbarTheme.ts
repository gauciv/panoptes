import { useEffect } from 'react';

const SCROLLBAR_STYLE_ID = 'dynamic-scrollbar-styles';

const lightScrollbarCSS = `
  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-left: 1px solid #e0e0e0;
  }
  ::-webkit-scrollbar-thumb {
    background: #006A33;
    border: 2px solid #f1f1f1;
    border-radius: 6px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #008844;
  }
  ::-webkit-scrollbar-corner {
    background: #f1f1f1;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: #006A33 #f1f1f1;
  }
`;

const darkScrollbarCSS = `
  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  ::-webkit-scrollbar-track {
    background: #0a0a0a;
    border-left: 1px solid rgba(0, 106, 51, 0.3);
  }
  ::-webkit-scrollbar-thumb {
    background: #006A33;
    border: 2px solid #0a0a0a;
    border-radius: 6px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #008844;
    box-shadow: 0 0 10px rgba(0, 255, 102, 0.3);
  }
  ::-webkit-scrollbar-corner {
    background: #0a0a0a;
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: #006A33 #0a0a0a;
  }
`;

export function useScrollbarTheme(isDark: boolean) {
  useEffect(() => {
    // Remove existing style tag if present
    const existingStyle = document.getElementById(SCROLLBAR_STYLE_ID);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style tag with appropriate scrollbar styles
    const styleTag = document.createElement('style');
    styleTag.id = SCROLLBAR_STYLE_ID;
    styleTag.textContent = isDark ? darkScrollbarCSS : lightScrollbarCSS;
    document.head.appendChild(styleTag);

    return () => {
      const style = document.getElementById(SCROLLBAR_STYLE_ID);
      if (style) {
        style.remove();
      }
    };
  }, [isDark]);
}
