// What the server says to people, in their language (27 Nov). The app sends x-lang; English stays the source.
// Only fixed sentences are here; a message with numbers in it stays English rather than half-translated.
import type { NextFunction, Request, Response } from 'express';
import { langOf, type Lang } from './lang';

type Other = Exclude<Lang, 'en'>;

export const MESSAGES: Record<string, Record<Other, string>> = {
  "A challenge counts only at the gem itself (within 300 m). Try again when you are there.": {
    "nl": "Een challenge telt alleen bij de gem zelf (binnen 300 m). Probeer het opnieuw als je er bent.",
    "fr": "Un défi ne compte qu'à la pépite elle-même (à moins de 300 m). Réessaie quand tu y es.",
    "de": "Eine Challenge zählt nur direkt beim Gem (im Umkreis von 300 m). Versuch es noch einmal, wenn du dort bist.",
    "es": "Un reto solo cuenta en la joya misma (a menos de 300 m). Inténtalo de nuevo cuando estés allí.",
    "it": "Una sfida conta solo alla gemma stessa (entro 300 m). Riprova quando sei lì."
  },
  "A trip has at most 30 days.": {
    "nl": "Een trip heeft maximaal 30 dagen.",
    "fr": "Un voyage compte au maximum 30 jours.",
    "de": "Eine Reise hat höchstens 30 Tage.",
    "es": "Un viaje tiene como máximo 30 días.",
    "it": "Un viaggio ha al massimo 30 giorni."
  },
  "Add where you start and where you end.": {
    "nl": "Vul in waar je vertrekt en waar je aankomt.",
    "fr": "Indique d'où tu pars et où tu arrives.",
    "de": "Gib an, wo du startest und wo du ankommst.",
    "es": "Indica dónde empiezas y dónde terminas.",
    "it": "Indica da dove parti e dove arrivi."
  },
  "Already collected": {
    "nl": "Al verzameld",
    "fr": "Déjà récupérée",
    "de": "Schon gesammelt",
    "es": "Ya conseguida",
    "it": "Già raccolta"
  },
  "An account with this email already exists": {
    "nl": "Er bestaat al een account met dit e-mailadres",
    "fr": "Un compte existe déjà avec cet e-mail",
    "de": "Es gibt schon ein Konto mit dieser E-Mail",
    "es": "Ya existe una cuenta con este correo",
    "it": "Esiste già un account con questa email"
  },
  "Authentication required": {
    "nl": "Log eerst in",
    "fr": "Connecte-toi d'abord",
    "de": "Bitte melde dich zuerst an",
    "es": "Inicia sesión primero",
    "it": "Accedi prima"
  },
  "Collect gems on your own trips.": {
    "nl": "Verzamel gems op je eigen trips.",
    "fr": "Collectionne les pépites sur tes propres voyages.",
    "de": "Sammle Gems auf deinen eigenen Reisen.",
    "es": "Colecciona joyas en tus propios viajes.",
    "it": "Raccogli gemme nei tuoi viaggi."
  },
  "Free members post one photo a day. Plus posts without limit.": {
    "nl": "Gratis leden posten één foto per dag. Met Plus post je onbeperkt.",
    "fr": "Les membres gratuits publient une photo par jour. Avec Plus, sans limite.",
    "de": "Kostenlose Mitglieder posten ein Foto am Tag. Mit Plus unbegrenzt.",
    "es": "Los miembros gratis publican una foto al día. Con Plus, sin límite.",
    "it": "I membri gratuiti pubblicano una foto al giorno. Con Plus senza limiti."
  },
  "Free plan is limited to 1 saved trip. Upgrade to premium for unlimited trips.": {
    "nl": "Het gratis plan bewaart één trip. Met Plus bewaar je onbeperkt trips.",
    "fr": "L'offre gratuite garde un voyage. Avec Plus, des voyages illimités.",
    "de": "Der kostenlose Plan speichert eine Reise. Mit Plus unbegrenzt viele.",
    "es": "El plan gratis guarda un viaje. Con Plus, viajes ilimitados.",
    "it": "Il piano gratuito salva un viaggio. Con Plus, viaggi illimitati."
  },
  "Gem not found": {
    "nl": "Gem niet gevonden",
    "fr": "Pépite introuvable",
    "de": "Gem nicht gefunden",
    "es": "Joya no encontrada",
    "it": "Gemma non trovata"
  },
  "Give the gem a name.": {
    "nl": "Geef de gem een naam.",
    "fr": "Donne un nom à la pépite.",
    "de": "Gib dem Gem einen Namen.",
    "es": "Ponle un nombre a la joya.",
    "it": "Dai un nome alla gemma."
  },
  "Invalid email or password": {
    "nl": "E-mail of wachtwoord klopt niet",
    "fr": "E-mail ou mot de passe incorrect",
    "de": "E-Mail oder Passwort stimmt nicht",
    "es": "Correo o contraseña incorrectos",
    "it": "Email o password errati"
  },
  "Invalid or expired token": {
    "nl": "Je sessie is verlopen. Log opnieuw in.",
    "fr": "Ta session a expiré. Reconnecte-toi.",
    "de": "Deine Sitzung ist abgelaufen. Melde dich neu an.",
    "es": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    "it": "La sessione è scaduta. Accedi di nuovo."
  },
  "Not found": {
    "nl": "Niet gevonden",
    "fr": "Introuvable",
    "de": "Nicht gefunden",
    "es": "No encontrado",
    "it": "Non trovato"
  },
  "Only the person who planned this trip can change it.": {
    "nl": "Alleen wie deze trip plande, kan hem wijzigen.",
    "fr": "Seule la personne qui a planifié ce voyage peut le modifier.",
    "de": "Nur wer diese Reise geplant hat, kann sie ändern.",
    "es": "Solo quien planeó este viaje puede cambiarlo.",
    "it": "Solo chi ha pianificato questo viaggio può modificarlo."
  },
  "Only whoever planned this trip can do this.": {
    "nl": "Alleen wie deze trip plande, kan dit doen.",
    "fr": "Seule la personne qui a planifié ce voyage peut faire ça.",
    "de": "Das kann nur, wer diese Reise geplant hat.",
    "es": "Solo quien planeó este viaje puede hacerlo.",
    "it": "Solo chi ha pianificato questo viaggio può farlo."
  },
  "Payments are not open yet.": {
    "nl": "Betalen kan nog niet.",
    "fr": "Les paiements ne sont pas encore ouverts.",
    "de": "Zahlungen sind noch nicht möglich.",
    "es": "Los pagos aún no están abiertos.",
    "it": "I pagamenti non sono ancora aperti."
  },
  "Photo not available": {
    "nl": "Foto niet beschikbaar",
    "fr": "Photo indisponible",
    "de": "Foto nicht verfügbar",
    "es": "Foto no disponible",
    "it": "Foto non disponibile"
  },
  "Plus is started through checkout.": {
    "nl": "Plus start je via de betaalpagina.",
    "fr": "Plus se démarre via la page de paiement.",
    "de": "Plus startest du über die Bezahlseite.",
    "es": "Plus se activa desde la página de pago.",
    "it": "Plus si attiva dalla pagina di pagamento."
  },
  "Post not found.": {
    "nl": "Post niet gevonden.",
    "fr": "Publication introuvable.",
    "de": "Beitrag nicht gefunden.",
    "es": "Publicación no encontrada.",
    "it": "Post non trovato."
  },
  "Say in a sentence what makes it special.": {
    "nl": "Zeg in een zin wat hem bijzonder maakt.",
    "fr": "Dis en une phrase ce qui la rend spéciale.",
    "de": "Sag in einem Satz, was ihn besonders macht.",
    "es": "Di en una frase qué la hace especial.",
    "it": "Di' in una frase cosa la rende speciale."
  },
  "Sign in to see posts along your route.": {
    "nl": "Log in om posts langs je route te zien.",
    "fr": "Connecte-toi pour voir les publications sur ta route.",
    "de": "Melde dich an, um Beiträge entlang deiner Route zu sehen.",
    "es": "Inicia sesión para ver publicaciones en tu ruta.",
    "it": "Accedi per vedere i post lungo il tuo percorso."
  },
  "Something went wrong on our end.": {
    "nl": "Er ging bij ons iets mis.",
    "fr": "Un souci de notre côté.",
    "de": "Bei uns ist etwas schiefgelaufen.",
    "es": "Algo falló por nuestra parte.",
    "it": "Qualcosa è andato storto da parte nostra."
  },
  "Still writing your days.": {
    "nl": "Je dagen worden nog geschreven.",
    "fr": "Tes journées sont encore en cours d'écriture.",
    "de": "Deine Tage werden noch geschrieben.",
    "es": "Aún se están escribiendo tus días.",
    "it": "Sto ancora scrivendo le tue giornate."
  },
  "Suggesting new gems comes with Plus.": {
    "nl": "Nieuwe gems voorstellen kan met Plus.",
    "fr": "Proposer de nouvelles pépites, c'est avec Plus.",
    "de": "Neue Gems vorschlagen geht mit Plus.",
    "es": "Proponer joyas nuevas viene con Plus.",
    "it": "Proporre nuove gemme è incluso in Plus."
  },
  "Tag a gem within 5 km of where you are.": {
    "nl": "Tag een gem binnen 5 km van waar je bent.",
    "fr": "Choisis une pépite à moins de 5 km de là où tu es.",
    "de": "Tagge einen Gem im Umkreis von 5 km um deinen Standort.",
    "es": "Etiqueta una joya a menos de 5 km de donde estás.",
    "it": "Scegli una gemma entro 5 km da dove sei."
  },
  "Thanks! That is a lot of feedback for one hour: try again later.": {
    "nl": "Bedankt! Dat is veel feedback in een uur: probeer het later opnieuw.",
    "fr": "Merci ! Ça fait beaucoup d'avis en une heure : réessaie plus tard.",
    "de": "Danke! Das ist viel Feedback in einer Stunde: versuch es später noch einmal.",
    "es": "¡Gracias! Es mucha opinión en una hora: inténtalo más tarde.",
    "it": "Grazie! Sono tanti feedback in un'ora: riprova più tardi."
  },
  "That day is not in this trip.": {
    "nl": "Die dag zit niet in deze trip.",
    "fr": "Ce jour n'est pas dans ce voyage.",
    "de": "Dieser Tag gehört nicht zu dieser Reise.",
    "es": "Ese día no está en este viaje.",
    "it": "Quel giorno non è in questo viaggio."
  },
  "That gem is not on this trip.": {
    "nl": "Die gem hoort niet bij deze trip.",
    "fr": "Cette pépite n'est pas sur ce voyage.",
    "de": "Dieser Gem gehört nicht zu dieser Reise.",
    "es": "Esa joya no está en este viaje.",
    "it": "Quella gemma non è in questo viaggio."
  },
  "That is a lot of check-ins. Try again in an hour.": {
    "nl": "Dat zijn veel check-ins. Probeer het over een uur opnieuw.",
    "fr": "Ça fait beaucoup de pointages. Réessaie dans une heure.",
    "de": "Das sind viele Check-ins. Versuch es in einer Stunde noch einmal.",
    "es": "Son muchos registros. Inténtalo dentro de una hora.",
    "it": "Sono tante registrazioni. Riprova tra un'ora."
  },
  "That is a lot of gems. Try again in an hour.": {
    "nl": "Dat zijn veel gems. Probeer het over een uur opnieuw.",
    "fr": "Ça fait beaucoup de pépites. Réessaie dans une heure.",
    "de": "Das sind viele Gems. Versuch es in einer Stunde noch einmal.",
    "es": "Son muchas joyas. Inténtalo dentro de una hora.",
    "it": "Sono tante gemme. Riprova tra un'ora."
  },
  "That is a lot of photos. Try again in an hour.": {
    "nl": "Dat zijn veel foto's. Probeer het over een uur opnieuw.",
    "fr": "Ça fait beaucoup de photos. Réessaie dans une heure.",
    "de": "Das sind viele Fotos. Versuch es in einer Stunde noch einmal.",
    "es": "Son muchas fotos. Inténtalo dentro de una hora.",
    "it": "Sono tante foto. Riprova tra un'ora."
  },
  "That stop is not on this route.": {
    "nl": "Die stop ligt niet op deze route.",
    "fr": "Cette étape n'est pas sur cet itinéraire.",
    "de": "Dieser Stopp liegt nicht auf dieser Route.",
    "es": "Esa parada no está en esta ruta.",
    "it": "Quella tappa non è su questo percorso."
  },
  "The cheapest route comes with Plus.": {
    "nl": "De goedkoopste route krijg je met Plus.",
    "fr": "L'itinéraire le moins cher vient avec Plus.",
    "de": "Die günstigste Route gibt es mit Plus.",
    "es": "La ruta más barata viene con Plus.",
    "it": "Il percorso più economico è incluso in Plus."
  },
  "The map is not available right now.": {
    "nl": "De kaart is nu niet beschikbaar.",
    "fr": "La carte n'est pas disponible pour le moment.",
    "de": "Die Karte ist gerade nicht verfügbar.",
    "es": "El mapa no está disponible ahora.",
    "it": "La mappa non è disponibile al momento."
  },
  "The monthly challenge comes with Plus.": {
    "nl": "De maandelijkse challenge krijg je met Plus.",
    "fr": "Le défi du mois vient avec Plus.",
    "de": "Die Monats-Challenge gibt es mit Plus.",
    "es": "El reto del mes viene con Plus.",
    "it": "La sfida del mese è inclusa in Plus."
  },
  "This gem is missing its place.": {
    "nl": "Deze gem mist zijn plek.",
    "fr": "Cette pépite n'a pas de lieu.",
    "de": "Diesem Gem fehlt der Ort.",
    "es": "A esta joya le falta su lugar.",
    "it": "A questa gemma manca il luogo."
  },
  "This gem is not available.": {
    "nl": "Deze gem is niet beschikbaar.",
    "fr": "Cette pépite n'est pas disponible.",
    "de": "Dieser Gem ist nicht verfügbar.",
    "es": "Esta joya no está disponible.",
    "it": "Questa gemma non è disponibile."
  },
  "This photo could not be read. Try another one.": {
    "nl": "Deze foto kon niet gelezen worden. Probeer een andere.",
    "fr": "Cette photo n'a pas pu être lue. Essaie-en une autre.",
    "de": "Dieses Foto konnte nicht gelesen werden. Probier ein anderes.",
    "es": "No se pudo leer esta foto. Prueba con otra.",
    "it": "Non è stato possibile leggere la foto. Provane un'altra."
  },
  "This post is not public.": {
    "nl": "Deze post is niet openbaar.",
    "fr": "Cette publication n'est pas publique.",
    "de": "Dieser Beitrag ist nicht öffentlich.",
    "es": "Esta publicación no es pública.",
    "it": "Questo post non è pubblico."
  },
  "This trip has no other route.": {
    "nl": "Deze trip heeft geen andere route.",
    "fr": "Ce voyage n'a pas d'autre itinéraire.",
    "de": "Diese Reise hat keine andere Route.",
    "es": "Este viaje no tiene otra ruta.",
    "it": "Questo viaggio non ha un altro percorso."
  },
  "This trip just changed elsewhere. Reload the page and try again.": {
    "nl": "Deze trip is net ergens anders gewijzigd. Herlaad de pagina en probeer opnieuw.",
    "fr": "Ce voyage vient d'être modifié ailleurs. Recharge la page et réessaie.",
    "de": "Diese Reise wurde gerade woanders geändert. Lade die Seite neu und versuch es noch einmal.",
    "es": "Este viaje acaba de cambiar en otro sitio. Recarga la página e inténtalo de nuevo.",
    "it": "Questo viaggio è appena cambiato altrove. Ricarica la pagina e riprova."
  },
  "Trip not found": {
    "nl": "Trip niet gevonden",
    "fr": "Voyage introuvable",
    "de": "Reise nicht gefunden",
    "es": "Viaje no encontrado",
    "it": "Viaggio non trovato"
  },
  "Trip not found.": {
    "nl": "Trip niet gevonden.",
    "fr": "Voyage introuvable.",
    "de": "Reise nicht gefunden.",
    "es": "Viaje no encontrado.",
    "it": "Viaggio non trovato."
  },
  "Trip planning is not available right now. Please try again later.": {
    "nl": "Trips plannen kan nu even niet. Probeer het later opnieuw.",
    "fr": "La planification n'est pas disponible pour le moment. Réessaie plus tard.",
    "de": "Reisen planen geht gerade nicht. Versuch es später noch einmal.",
    "es": "Ahora no se pueden planear viajes. Inténtalo más tarde.",
    "it": "Al momento non è possibile pianificare viaggi. Riprova più tardi."
  },
  "Unknown change.": {
    "nl": "Onbekende wijziging.",
    "fr": "Modification inconnue.",
    "de": "Unbekannte Änderung.",
    "es": "Cambio desconocido.",
    "it": "Modifica sconosciuta."
  },
  "Unknown language.": {
    "nl": "Onbekende taal.",
    "fr": "Langue inconnue.",
    "de": "Unbekannte Sprache.",
    "es": "Idioma desconocido.",
    "it": "Lingua sconosciuta."
  },
  "Which gem?": {
    "nl": "Welke gem?",
    "fr": "Quelle pépite ?",
    "de": "Welcher Gem?",
    "es": "¿Qué joya?",
    "it": "Quale gemma?"
  },
  "Write a short message first.": {
    "nl": "Schrijf eerst een kort bericht.",
    "fr": "Écris d'abord un court message.",
    "de": "Schreib zuerst eine kurze Nachricht.",
    "es": "Escribe primero un mensaje corto.",
    "it": "Scrivi prima un breve messaggio."
  },
  "You can only add gems to your own trips.": {
    "nl": "Je kunt alleen gems toevoegen aan je eigen trips.",
    "fr": "Tu peux seulement ajouter des pépites à tes propres voyages.",
    "de": "Du kannst Gems nur zu deinen eigenen Reisen hinzufügen.",
    "es": "Solo puedes añadir joyas a tus propios viajes.",
    "it": "Puoi aggiungere gemme solo ai tuoi viaggi."
  },
  "You cannot like your own post.": {
    "nl": "Je kunt je eigen post niet liken.",
    "fr": "Tu ne peux pas aimer ta propre publication.",
    "de": "Du kannst deinen eigenen Beitrag nicht liken.",
    "es": "No puedes dar me gusta a tu propia publicación.",
    "it": "Non puoi mettere mi piace al tuo post."
  },
  "Your days are still being written. Try again in a few seconds.": {
    "nl": "Je dagen worden nog geschreven. Probeer het over een paar seconden opnieuw.",
    "fr": "Tes journées sont encore en cours d'écriture. Réessaie dans quelques secondes.",
    "de": "Deine Tage werden noch geschrieben. Versuch es in ein paar Sekunden noch einmal.",
    "es": "Tus días aún se están escribiendo. Inténtalo en unos segundos.",
    "it": "Le tue giornate sono ancora in scrittura. Riprova tra qualche secondo."
  },
  "Your location is needed to check in.": {
    "nl": "Je locatie is nodig om in te checken.",
    "fr": "Ta position est nécessaire pour pointer.",
    "de": "Zum Einchecken brauchen wir deinen Standort.",
    "es": "Se necesita tu ubicación para registrarte.",
    "it": "Serve la tua posizione per registrarti."
  },
  "Your location is needed to check you are at the gem.": {
    "nl": "Je locatie is nodig om te checken of je bij de gem bent.",
    "fr": "Ta position est nécessaire pour vérifier que tu es à la pépite.",
    "de": "Wir brauchen deinen Standort, um zu prüfen, dass du beim Gem bist.",
    "es": "Se necesita tu ubicación para comprobar que estás en la joya.",
    "it": "Serve la tua posizione per verificare che sei alla gemma."
  },
  "Your location is needed to find gems nearby.": {
    "nl": "Je locatie is nodig om gems in de buurt te vinden.",
    "fr": "Ta position est nécessaire pour trouver les pépites proches.",
    "de": "Wir brauchen deinen Standort, um Gems in der Nähe zu finden.",
    "es": "Se necesita tu ubicación para encontrar joyas cercanas.",
    "it": "Serve la tua posizione per trovare gemme vicine."
  },
  "Too many clicks": {
    "nl": "Te veel kliks",
    "fr": "Trop de clics",
    "de": "Zu viele Klicks",
    "es": "Demasiados clics",
    "it": "Troppi clic"
  },
  "User not found": {
    "nl": "Gebruiker niet gevonden",
    "fr": "Utilisateur introuvable",
    "de": "Nutzer nicht gefunden",
    "es": "Usuario no encontrado",
    "it": "Utente non trovato"
  }
};

export function translateMessage(message: string, lang: Lang): string {
  if (lang === 'en') return message;
  return MESSAGES[message]?.[lang] ?? message;
}

/** Sets req.lang from x-lang and answers { error } messages in that language. */
export function speakLanguage(req: Request, res: Response, next: NextFunction): void {
  const lang = langOf(req.headers['x-lang']);
  (req as Request & { lang: Lang }).lang = lang;
  if (lang !== 'en') {
    const json = res.json.bind(res);
    res.json = ((body: unknown) => {
      const b = body as { error?: unknown } | null;
      return json(b && typeof b === 'object' && typeof b.error === 'string' ? { ...b, error: translateMessage(b.error, lang) } : body);
    }) as typeof res.json;
  }
  next();
}
