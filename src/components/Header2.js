import Link from "next/link";

export default function Header2() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-6 px-6 md:px-12 bg-transparent">
      <nav className="flex justify-between items-start mx-auto">
        {/* Left side - Company name */}
        <div className="text-gray-500 font-roboto">
          
          <div className="text-xs leading-tight transition-colors">
            <div>
              <Link 
                target="_blank"
                href="https://x.com/AI_BRK/status/1955356973949714822"
                className="underline cursor-pointer"
              >
                COINTEXT
              </Link>
            </div>
            <div>
              <Link 
                target="_blank"
                href="https://x.com/AI_BRK/status/1955356973949714822"
                className="underline cursor-pointer"
              >
                FUND
              </Link>
            </div>
            <div>
              <Link 
                target="_blank"
                href="https://x.com/AI_BRK/status/1955356973949714822"
                className="underline cursor-pointer"
              >
                001
              </Link>
            </div>
          </div>
        </div>

        {/* Right side - Fund link */}
        <div className="text-gray-500">
        </div>
      </nav>
    </header>
  );
}
