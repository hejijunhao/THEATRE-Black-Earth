// Binding confound: localStorage tbe-counters=1 forces NATO plates at
// every zoom. Machine / strip-field gates cannot be judged while it is on.

export async function clearCountersBeforeScripts(page) {
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('tbe-counters', '0'); } catch { /* private mode */ }
  });
}

export async function assertCountersOff(page, label = 'counters') {
  const state = await page.evaluate(() => {
    try { localStorage.setItem('tbe-counters', '0'); } catch { /* private mode */ }
    const hook = window.__TBE_DEBUG__;
    if (hook?.setCounterMode) hook.setCounterMode(false);
    return {
      stored: (() => {
        try { return localStorage.getItem('tbe-counters'); } catch { return '0'; }
      })(),
      mode: hook?.counterMode ? hook.counterMode() : null,
    };
  });
  console.log(`${label}:`, JSON.stringify(state));
  if (state.stored === '1' || state.mode === true) {
    console.error(`FAIL: tbe-counters still on — machines cannot be judged (${label})`);
    process.exitCode = 1;
  }
  return state;
}
