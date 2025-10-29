import Link from "next/link";

export default function Header() {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '0.1rem solid var(--secondary)'
    }}>
      <ul role="menu-bar" style={{ margin: 0, padding: 0 }}>
        <li role="menu-item" tabIndex={0}>
          <span className="apple"></span>
        </li>
        <li role="menu-item" aria-haspopup="true" tabIndex={0}>
          FUDSCAN
          <ul role="menu">
            <li role="menu-item">
              <Link href="/">Chat</Link>
            </li>
            <li role="menu-item">
              <Link href="/fund">Fund 001</Link>
            </li>
            <li role="menu-item" className="divider"></li>
            <li role="menu-item">
              <a href="https://fudscan.ai" target="_blank" rel="noopener noreferrer">About</a>
            </li>
          </ul>
        </li>
      </ul>
    </header>
  );
}
