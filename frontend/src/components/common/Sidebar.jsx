import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', icon: '◈', label: 'Dashboard', exact: true },
  { to: '/practice', icon: '✦', label: 'Practice' },
  { to: '/vocabulary', icon: '◇', label: 'Vocabulary' },
  { to: '/upload', icon: '↑', label: 'Upload' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-orange))',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem',
          }}>ع</div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Arabic Studio
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Vocabulary Trainer</div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <div style={{ padding: '12px 10px', flex: 1 }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '2px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(212,168,83,0.1)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              border: isActive ? '1px solid rgba(212,168,83,0.2)' : '1px solid transparent',
            })}
          >
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '16px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6
      }}>
        <div style={{ fontFamily: 'var(--arabic-font)', fontSize: '1rem', color: 'var(--accent-gold)', opacity: 0.6, marginBottom: 4 }}>
          اللغة العربية
        </div>
        Arabic Learning Studio
      </div>
    </nav>
  );
}
