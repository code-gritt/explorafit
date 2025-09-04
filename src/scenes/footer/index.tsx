const Footer = () => {
  return (
    <footer className="bg-primary-100 py-16">
      <div className="justify-content mx-auto w-5/6 gap-16 md:flex">
        {/* LOGO + ABOUT */}
        <div className="mt-16 basis-1/2 md:mt-0">
          <div className="flex items-center gap-3">
            {/* Simple Bike-Inspired Logo SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              width="40"
              height="40"
              fill="currentColor"
              className="text-primary-500"
            >
              <circle
                cx="16"
                cy="48"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="48"
                cy="48"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
              />
              <line
                x1="16"
                y1="48"
                x2="32"
                y2="20"
                stroke="currentColor"
                strokeWidth="3"
              />
              <line
                x1="48"
                y1="48"
                x2="32"
                y2="20"
                stroke="currentColor"
                strokeWidth="3"
              />
              <line
                x1="32"
                y1="20"
                x2="32"
                y2="10"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
            <span className="text-2xl font-bold text-primary-500">
              Explorafit
            </span>
          </div>

          <p className="my-5">
            Explorafit helps cyclists plan smarter routes, discover new paths,
            and connect with a community of riders who share your passion for
            exploration. Ride more, explore better.
          </p>
          <p>© {new Date().getFullYear()} Explorafit. All Rights Reserved.</p>
        </div>

        {/* QUICK LINKS */}
        <div className="mt-16 basis-1/4 md:mt-0">
          <h4 className="font-bold">Quick Links</h4>
          <p className="my-5">Plan a Route</p>
          <p className="my-5">Cycling Community</p>
          <p className="my-5">Explore Paths</p>
          <p>Blog & Resources</p>
        </div>

        {/* CONTACT INFO */}
        <div className="mt-16 basis-1/4 md:mt-0">
          <h4 className="font-bold">Contact Us</h4>
          <p className="my-5">
            Have questions or feedback? We’d love to hear from you.
          </p>
          <p>support@explorafit.com</p>
          <p>+91 98765 43210</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
