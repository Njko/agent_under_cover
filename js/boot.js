// Applique le mode low-tech avant le premier affichage (évite un flash de l'autre thème) :
// choix mémorisé sur ce téléphone, sinon option « économie de données » du navigateur.
// Script classique (non module) chargé de manière bloquante dans <head>.
try {
  var lowtech = localStorage.getItem("lowtech");
  if (lowtech === "true" || (lowtech === null && navigator.connection && navigator.connection.saveData)) {
    document.documentElement.setAttribute("data-lowtech", "");
  }
} catch (e) {
  /* stockage indisponible : affichage normal */
}
