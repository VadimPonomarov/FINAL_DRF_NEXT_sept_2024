// This file is for compatibility with Next.js error handling
// In App Router, error.tsx and global-error.tsx should be used instead

import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialProps?: boolean;
  err?: Error;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>
        {statusCode
          ? `An error ${statusCode} occurred on server`
          : 'An error occurred on client'}
      </h1>
      <p>Please try refreshing the page or go back to the home page.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
