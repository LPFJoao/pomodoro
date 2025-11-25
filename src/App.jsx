import { useState, useEffect } from 'react'
import './App.css'

function App() {
  useEffect(() => {
    
    import('./component/pomodoro.js').catch(err => console.error('Failed to load pomodoro.js:', err));
  }, []);

  return (
    <>
      <section className="app">
  <header className="topbar">
    <h1>Pomodoro – Study Tracker</h1>
    <div className="actions">
      <button id="btnSettings" className="btn">⚙ Settings</button>
      <button id="btnExport" className="btn">⬇ Export CSV</button>
      <span id="status" className="badge">Idle</span>
    </div>
  </header>

  <div className="layout">
  
    <main className="panel timer">
      <div className="mode" id="mode">Work</div>

      <div className="ring">
        <svg viewBox="0 0 120 120" className="dial" aria-hidden="true">
          <circle cx="60" cy="60" r="54" className="bg"></circle>
          <circle cx="60" cy="60" r="54" className="fg" id="arc"></circle>
        </svg>
        <div className="time" id="time">25:00</div>
        <div className="current-task">
          <label>Current task</label>
          <select id="taskSel"></select>
        </div>
      </div>

      <div className="controls">
        <button id="start" className="btn btn-primary">Start</button>
        <button id="pause" className="btn" disabled>Pause</button>
        <button id="reset" className="btn">Reset</button>
        <button id="skip" className="btn">Skip</button>
      </div>

      <div className="cycle">
        <span id="cycleInfo">Cycle 0 / 4</span>
        <span>•</span>
        <span id="pomCount">0 pomodoros</span>
      </div>
    </main>

    
    <aside className="panel tasks">
      <h2>Tasks</h2>
      <form id="taskForm" className="row" autoComplete="off">
        <input id="taskInput" type="text" placeholder="Add a task…" />
        <button className="btn">Add</button>
      </form>
      <ul id="taskList" className="task-list" aria-live="polite"></ul>
    </aside>

    
    <aside className="panel stats">
      <h2>Stats</h2>
      <div className="grid">
        <div className="card">
          <div className="k">Today</div>
          <div className="v" id="todayTime">0m</div>
        </div>
        <div className="card">
          <div className="k">Pomodoros</div>
          <div className="v" id="totalPoms">0</div>
        </div>
      </div>
      <h3>Last 7 days (mins)</h3>
      <canvas id="chart" height="120"></canvas>
      <small className="muted">Tip: Space = Start/Pause, R = Reset, S = Skip.</small>
    </aside>
  </div>

  
  <dialog id="dlg">
    <form method="dialog" className="settings">
      <h2>Settings</h2>
      <div className="grid2">
        <label>Work (min)
          <input id="sWork" type="number" min="1" max="120" defaultValue="25"/>
        </label>
        <label>Short break (min)
          <input id="sShort" type="number" min="1" max="60" defaultValue="5"/>
        </label>
        <label>Long break (min)
          <input id="sLong" type="number" min="1" max="60" defaultValue="15"/>
        </label>
        <label>Cycles to long break
          <input id="sCycles" type="number" min="2" max="12" defaultValue="4"/>
        </label>
      </div>

      <div className="grid2">
        <label className="check"><input id="sAutoStartWork" type="checkbox"/> Auto-start Work</label>
        <label className="check"><input id="sAutoStartBreak" type="checkbox"/> Auto-start Breaks</label>
        <label className="check"><input id="sSound" type="checkbox" defaultChecked/> Play sound at end</label>
        <label className="check"><input id="sNotify" type="checkbox"/> Desktop notifications</label>
      </div>

      <menu className="dlg-actions">
        <button id="closeDlg" className="btn">Close</button>
        <button id="saveDlg" className="btn btn-primary">Save</button>
      </menu>
    </form>
  </dialog>

  <audio id="beep" preload="auto"></audio>

  
  <template id="taskTpl">
    <li className="task">
      <label className="row">
        <input className="chk" type="checkbox" />
        <span className="name"></span>
      </label>
      <span className="meta"><b className="poms">0</b> 🍅</span>
      <button className="del" title="Delete">✕</button>
    </li>
  </template>
      </section>
    </>
  );
}

export default App
