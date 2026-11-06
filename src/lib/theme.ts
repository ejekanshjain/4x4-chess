export type Theme = 'light' | 'dark'

export const THEME_KEY = 'chess4_theme'

// Applies the saved theme, or the system preference when nothing is saved, before first paint.
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}`
