"use client";
/**
 * Onglet Publications : un seul espace pour piloter (vue d'ensemble, communication automatique, stratégie), créer
 * (publication image, publication vidéo, plusieurs publications) et gérer (calendrier, validation, statistiques),
 * avec son sous-menu à gauche. Les comptes des réseaux se relient dans Outils avancés › Connexions.
 */
import { SocialStudio } from "./social-studio";

export default function TabPublications() {
  return <SocialStudio initial="vue" />;
}
