import { pinyin } from "pinyin-pro";

const CYRILLIC: Readonly<Record<string, string>> = {
  а: "a", б: "b", в: "v", г: "g", ґ: "g", д: "d", е: "e", ё: "e", є: "ye", ж: "zh", з: "z", и: "i", і: "i", ї: "yi",
  й: "y", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ў: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", џ: "dz", ш: "sh", щ: "shch", ъ: "a", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ђ: "dj", ћ: "c", ѓ: "g", ќ: "k", ѕ: "dz", ә: "a", ғ: "g", қ: "q", ң: "ng", ө: "o", ұ: "u", ү: "u", һ: "h",
};
const HAN = /\p{Script=Han}/u;
const KANA_OR_HANGUL = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const CYRILLIC_LETTER = /\p{Script=Cyrillic}/u;
const LATIN_LETTER = /[A-Za-z]/;

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

function fromCyrillic(text: string): string {
  const latin = [...text.toLowerCase()].map((ch) => CYRILLIC[ch] ?? ch).join("");
  return latin.split(/\s+/).filter((w) => w !== "").map(capitalise).join(" ");
}

function fromHan(text: string): string {
  return pinyin(text, { toneType: "none", type: "array", nonZh: "consecutive" })
    .join(" ")
    .split(/\s+/)
    .filter((w) => w !== "")
    .map(capitalise)
    .join(" ");
}

/**
 * Latin-script reading of a name written in Cyrillic or in Chinese characters; undefined for any other script
 * (Japanese, Korean, Arabic...), whose resorts are keyed by OSM id instead of by a guessed reading.
 */
export function romanize(name: string): string | undefined {
  if (LATIN_LETTER.test(name)) {
    return undefined;
  }
  if (CYRILLIC_LETTER.test(name)) {
    return fromCyrillic(name);
  }
  if (HAN.test(name) && !KANA_OR_HANGUL.test(name)) {
    return fromHan(name);
  }
  return undefined;
}
