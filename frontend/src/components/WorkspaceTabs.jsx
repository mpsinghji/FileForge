import React from 'react';
import { useDarkMode } from '../App';
import { useWorkspace } from '../store/useWorkspace';

function WorkspaceTabs() {
  const { darkMode } = useDarkMode();
  const { tabs, activeTabId, setActiveTab, addTab, closeTab, renameTab } = useWorkspace();

  return (
    <div className={`flex items-center px-3 py-2 ${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
      <div className="flex space-x-2 overflow-x-auto scrollbar-thin">
        {tabs.map((t) => (
          <div key={t.id} className={`flex items-center space-x-2 px-3 py-1 rounded cursor-pointer ${activeTabId === t.id ? (darkMode ? 'bg-gray-700 text-white' : 'bg-blue-100 text-blue-700') : (darkMode ? 'bg-gray-700/40 text-gray-200' : 'bg-gray-100 text-gray-700')}`}
               onClick={() => setActiveTab(t.id)}>
            <input className={`bg-transparent outline-none w-28 ${darkMode ? 'text-white' : 'text-gray-800'}`} value={t.title} onChange={(e) => renameTab(t.id, e.target.value)} />
            <button onClick={(e) => { e.stopPropagation(); closeTab(t.id); }} className={`${darkMode ? 'hover:text-red-300' : 'hover:text-red-600'}`}>×</button>
          </div>
        ))}
        <button onClick={() => addTab()} className={`px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>+ New Tab</button>
      </div>
    </div>
  );
}

export default WorkspaceTabs;


