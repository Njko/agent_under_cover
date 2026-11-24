// Déclaration d'un atelier : lien vers le formulaire Microsoft Forms de l'organisation, pour compter
// les participants par direction (guide : doc/formulaire-declaration.md).
//
// DECLARATION_FORM_URL : lien prérempli copié depuis Forms, dans lequel on a saisi les marqueurs
// __DATE__, __EDITION__, __JOUEURS__ et __CODE__ à la place des réponses. Vide : pas de bouton.
// Ce n'est pas une requête de l'application : l'animateur ouvre le lien et envoie lui-même le formulaire.
// Aucun prénom ni score n'y figure.
// En renseignant (ou en vidant) cette constante, la case « Déclarer l'atelier » de la création de partie
// apparaît (ou disparaît) : incrémentez VERSION dans sw.js
// et ajoutez une entrée à js/changelog.js, dans toutes les langues.
export const DECLARATION_FORM_URL =
  "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=zDhrOWWqK0m7Dj2U7SWpe1u8I6CbiQRCsbPgmBeX5XdUMEJGSUMzVVlZSDczNjFIVExTWkpKRlU0Ri4u&ra2dd25f9bbba4ef8880d0df110a1a48e=__DATE__&r4e86b51eb261456b9ba6f3941825a57b=__EDITION__&r077ce659888e4a93aebba02ad803d5f6=__JOUEURS__&rb143ff8636b64b21bb760d06223c852a=__CODE__";

const pad = (n) => String(n).padStart(2, "0");

// Date locale de l'appareil (toISOString donnerait la date UTC, fausse autour de minuit).
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function declarationUrl(template, { date, edition, players, code }) {
  if (!template) return null;
  const values = { __DATE__: localDate(date), __EDITION__: edition, __JOUEURS__: players, __CODE__: code };
  return Object.entries(values).reduce((url, [marker, value]) => url.replaceAll(marker, encodeURIComponent(String(value))), template);
}
