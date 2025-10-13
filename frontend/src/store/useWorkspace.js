import { create } from 'zustand';

export const useWorkspace = create((set, get) => ({
  tabs: [
    { id: 'tab-1', title: 'Tab 1', panel: 'conversion', files: [] }
  ],
  activeTabId: 'tab-1',
  addTab: (title = 'New Tab', panel = 'conversion') => {
    const id = `tab-${Date.now()}`;
    set((state) => ({
      tabs: [...state.tabs, { id, title, panel, files: [] }],
      activeTabId: id
    }));
  },
  closeTab: (id) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      const activeTabId = state.activeTabId === id && tabs.length ? tabs[0].id : state.activeTabId;
      return { tabs, activeTabId };
    });
  },
  renameTab: (id, title) => set((state) => ({
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t))
  })),
  setActiveTab: (id) => set({ activeTabId: id }),
  setTabPanel: (id, panel) => set((state) => ({
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, panel } : t))
  })),
  setTabFiles: (id, files) => set((state) => ({
    tabs: state.tabs.map((t) => (t.id === id ? { ...t, files } : t))
  }))
}));


