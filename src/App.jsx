import page from "./page.html?raw";

const markup = page.replaceAll('/assets/', `${import.meta.env.BASE_URL}assets/`);

export function App() {
  function handleClick(event) {
    const button = event.target.closest('button');
    if (button && /^(Начать копить|Открыть вклад|Открыть счет)$/.test(button.textContent.trim())) {
      document.getElementById('choose-product')?.scrollIntoView();
    }
  }
  return <>
    <div onClick={handleClick} dangerouslySetInnerHTML={{ __html: markup }} />
    <a className="sphere-game-entry" href={`${import.meta.env.BASE_URL}sphere-game.html`}
      aria-label="Снеговичок: открыть игру Saving Survivors" title="Играть в Saving Survivors">
      <span className="sphere-game-entry-sprite" aria-hidden="true" />
    </a>
  </>;
}
