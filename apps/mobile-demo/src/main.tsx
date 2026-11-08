import ReactDOM from 'react-dom';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('mobile-demo 找不到 #root 容器');
}

// 本项目固定 React 17（react-dom@17），没有 React 18 的 createRoot，
// 因此沿用 ReactDOM.render。
ReactDOM.render(<App />, container);
