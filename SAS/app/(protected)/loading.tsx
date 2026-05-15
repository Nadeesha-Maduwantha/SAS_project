// =============================================================
//  loading.tsx
//  Path: app/(protected)/loading.tsx
//
//  Shows on every Next.js route navigation within (protected).
//  Blue splash screen + company logo + animated progress bar.
//  Disappears automatically once the page finishes rendering.
// =============================================================

export default function Loading() {
  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         9999,
      background:     '#1E2FBE',  // brand blue — matches uploaded colour
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            0,
    }}>

      {/* ── Company logo ───────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            16,
        marginBottom:   40,
      }}>
        {/*
          Logo image — save your PNG to /public/images/company-logo.png
          The white filter makes it visible on the blue background.
        */}
        <img
            src="/images/company-logo.png"
            alt="Dart Global Logistics"
            style={{
                width:     80,
                height:    80,
                objectFit: 'contain',
                filter:    'brightness(0) invert(1)',
                opacity:   0.95,
            }}
        />

        {/* Fallback / always-visible text */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize:      22,
            fontWeight:    900,
            color:         '#fff',
            letterSpacing: '-0.5px',
            lineHeight:    1,
          }}>
            SAS SYSTEM
          </div>
          <div style={{
            fontSize:      12,
            fontWeight:    700,
            color:         'rgba(255,255,255,0.65)',
            letterSpacing: '3px',
            marginTop:     4,
          }}>
            
          </div>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────────── */}
      <div style={{
        width:        220,
        height:       3,
        borderRadius: 99,
        background:   'rgba(255,255,255,0.2)',
        overflow:     'hidden',
        position:     'relative',
      }}>
        {/* Indeterminate sliding bar */}
        <div style={{
          position:     'absolute',
          top:          0,
          left:         '-60%',
          width:        '60%',
          height:       '100%',
          borderRadius: 99,
          background:   '#fff',
          animation:    'loadingBar 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        }} />
      </div>

      {/* ── Loading label ───────────────────────────────────────── */}
      <div style={{
        marginTop:     16,
        fontSize:      11,
        fontWeight:    600,
        color:         'rgba(255,255,255,0.5)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        Loading…
      </div>

      {/* Keyframe injected inline */}
      <style>{`
        @keyframes loadingBar {
          0%   { left: -60%; }
          100% { left: 110%; }
        }
      `}</style>

    </div>
  );
}