import page from "./page.html?raw";
import { Snowman } from './Snowman';

const markup = page.replaceAll('/assets/', `${import.meta.env.BASE_URL}assets/`);

export function App() {
  function handleClick(event) {
    const button = event.target.closest('button');
    if (button && /^(Начать копить|Открыть вклад|Открыть счет)$/.test(button.textContent.trim())) {
      document.getElementById('choose-product')?.scrollIntoView();
    }
  }
  return <><div onClick={handleClick} dangerouslySetInnerHTML={{ __html: markup }} /><Snowman /></>;
}
