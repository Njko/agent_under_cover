// Pages d'entrée (links/<langue>/<page>/, et les anciennes liens/<page>/) : elles donnent un aperçu de lien
// propre (titre, description, image) puis renvoient vers l'application en gardant le fragment (#join-…,
// #results-…), qui n'est jamais transmis au serveur. Sans fragment, on ouvre la route de la page (data-route).
// data-lang : langue du lien, retenue par l'application si le joueur n'a pas choisi sa langue lui-même.
var page = document.documentElement.dataset;
try {
  if (page.lang) localStorage.setItem("linkLang", JSON.stringify(page.lang));
} catch (e) {
  /* stockage indisponible : l'application prendra la langue du navigateur */
}
location.replace((page.root || "../../") + (location.hash || page.route || ""));
