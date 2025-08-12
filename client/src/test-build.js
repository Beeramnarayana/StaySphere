// This is a simple test file to verify the build process
console.log('✅ Client build test file is working!');

// Add a simple React component to ensure React is working
const React = require('react');
const ReactDOM = require('react-dom');

const TestComponent = () => {
  return React.createElement('div', null, '✅ Test component is working!');
};

// Only render in browser
if (typeof document !== 'undefined') {
  const root = document.createElement('div');
  root.id = 'test-root';
  document.body.appendChild(root);
  ReactDOM.render(React.createElement(TestComponent), root);
}

module.exports = TestComponent;
