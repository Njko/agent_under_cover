// Pages d'entrée (liens/<page>/) : elles donnent un aperçu de lien propre (titre, description, image)
// puis renvoient vers l'application en gardant le fragment (#join-…, #results-…), qui n'est jamais
// transmis au serveur. Sans fragment, on ouvre la route de la page (attribut data-route).
location.replace("../../" + (location.hash || document.documentElement.dataset.route || ""));
