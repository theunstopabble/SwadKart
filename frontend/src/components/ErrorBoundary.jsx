import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 Uncaught React Component Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-lg w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
              ⚠️
            </div>
            <h1 className="text-2xl font-black text-white">Something went wrong</h1>
            <p className="text-gray-400 text-sm">
              An unexpected error occurred while rendering the page.
            </p>
            {this.state.error && (
              <div className="bg-black/60 rounded-xl p-4 text-left font-mono text-xs text-red-400 border border-gray-800 overflow-x-auto max-h-48">
                {this.state.error.toString()}
              </div>
            )}
            <div className="flex gap-4 pt-4 justify-center">
              <button
                onClick={this.handleReload}
                className="bg-primary hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleResetSession}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
              >
                Reset Session & Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
