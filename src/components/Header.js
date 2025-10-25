import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-6 px-6 md:px-12 bg-transparent">
      <nav className="flex justify-between items-start mx-auto">
        {/* Left side - Company name */}
        <div className="text-gray-200">
          <div className="text-xl leading-tight">
            <div style={{
                fontFamily: 'Times New Roman',
              }}  className="flex items-baseline space-x-1">
              <span className="text-4xl">AI&nbsp;</span>
              <span className="text-xl"><em style={{fontStyle: 'normal'}} className="text-4xl ">B</em>ERKSHIRE</span>
              <span className="text-xl"><em style={{fontStyle: 'normal'}} className="text-4xl ">H</em>ATHAWAY</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Powered by <a href="https://www.cointext.org/chat" className="underline hover:text-gray-300 transition-colors">Cointext</a></div>
          </div>
        </div>

        {/* Right side - Fund link */}
        <div className="text-gray-500">
          <div className="text-xs text-right hover:text-gray-300 transition-colors">
            <div>
              <Link 
                href="/fund" 
              >
                COINTEXT
              </Link>
            </div>
            <div>
              <Link 
                href="/fund" 
              >
                FUND
              </Link>
            </div>
            <div>
              <Link 
                href="/fund" 
              >
                001
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
