# syntax=docker/dockerfile:1
# Image de l'application Undercover IA responsable : fichiers statiques servis par nginx,
# sans droits root, compatible avec un système de fichiers en lecture seule.
# Voir doc/docker.md.

# Image de base surchargeable (miroir d'entreprise, registre interne…) :
#   docker build --build-arg BASE_IMAGE=mirror.gcr.io/nginxinc/nginx-unprivileged:1.30-alpine .
ARG BASE_IMAGE=nginxinc/nginx-unprivileged:1.30-alpine
FROM ${BASE_IMAGE}

LABEL org.opencontainers.image.title="Undercover IA responsable" \
      org.opencontainers.image.description="Serious game Undercover sur les règles d'or de l'IA responsable (site statique, sans backend)" \
      org.opencontainers.image.source="https://github.com/Njko/agent_under_cover"

# Les pages par défaut de nginx sont retirées ; les fichiers de l'application appartiennent à root
# et ne sont que lisibles par l'utilisateur nginx (uid 101) qui fait tourner le serveur.
USER root
RUN rm -f /usr/share/nginx/html/*
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY index.html manifest.webmanifest sw.js /usr/share/nginx/html/
COPY css/    /usr/share/nginx/html/css/
COPY js/     /usr/share/nginx/html/js/
COPY icons/  /usr/share/nginx/html/icons/
COPY img/    /usr/share/nginx/html/img/
COPY vendor/ /usr/share/nginx/html/vendor/
USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
