#!/usr/bin/env python3
"""Génère match-manager-eps.pdf, le guide professeur de Match Manager EPS.
Usage : python3 generer-guide-professeur.py   (reportlab requis, polices Arial de macOS)

La version affichée est lue dans index.html (APP_VERSION) : relancer le script à chaque version.
Le texte est à mettre à jour ici quand une fonction visible change (voir FONCTIONNALITES.md).
Le PDF est publié sur WordPress (outils-eps.fr/wp-content/uploads/guides/match-manager-eps.pdf)."""
import os
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle)

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, 'match-manager-eps.pdf')
with open(os.path.join(ICI, 'index.html'), encoding='utf-8') as f:
    VERSION = re.search(r"APP_VERSION='([0-9.]+)'", f.read()).group(1)

POL = '/System/Library/Fonts/Supplemental/'
pdfmetrics.registerFont(TTFont('F', POL + 'Arial.ttf'))
pdfmetrics.registerFont(TTFont('FB', POL + 'Arial Bold.ttf'))
pdfmetrics.registerFont(TTFont('FI', POL + 'Arial Italic.ttf'))
pdfmetrics.registerFont(TTFont('FM', POL + 'Courier New Bold.ttf'))
pdfmetrics.registerFontFamily('F', normal='F', bold='FB', italic='FI', boldItalic='FB')

ORANGE = colors.HexColor('#F57C00')
ORANGE_BG = colors.HexColor('#FFF3E0')
TEAL = colors.HexColor('#00897B')
ROUGE = colors.HexColor('#C62828')
GRIS = colors.HexColor('#555555')

corps = ParagraphStyle('corps', fontName='F', fontSize=9.6, leading=13.4, spaceAfter=5, textColor=colors.HexColor('#333333'))
puce = ParagraphStyle('puce', parent=corps, leftIndent=14, bulletIndent=3, spaceAfter=3)
titre = ParagraphStyle('titre', fontName='FB', fontSize=24, leading=28, textColor=colors.HexColor('#222222'))
sous = ParagraphStyle('sous', fontName='F', fontSize=10.5, leading=14, textColor=GRIS, spaceAfter=4)
h2 = ParagraphStyle('h2', fontName='FB', fontSize=13, leading=16, textColor=ORANGE, spaceBefore=9, spaceAfter=4, keepWithNext=1)
note = ParagraphStyle('note', parent=corps, fontSize=8.8, leading=12.2)


def P(t, st=corps):
    return Paragraph(t, st)


def B(t):
    return Paragraph(t, puce, bulletText='•')


def en_tete(canvas, doc):
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(ORANGE)
    canvas.rect(0, h - 5 * mm, w, 5 * mm, stroke=0, fill=1)
    canvas.rect(0, 0, w, 5 * mm, stroke=0, fill=1)
    canvas.setFont('F', 8)
    canvas.setFillColor(GRIS)
    canvas.drawRightString(w - 20 * mm, 10 * mm,
                           'Guide professeur - Match Manager EPS - version %s - page %d' % (VERSION, doc.page))
    canvas.restoreState()


def mot_de_passe():
    t = Table([[Paragraph('<b>Mot de passe par défaut :</b>', corps),
                Paragraph('<font name="FM" size="14">ADMINPROF</font>', corps)]], colWidths=[62 * mm, 108 * mm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), ORANGE_BG), ('BOX', (0, 0), (-1, -1), 1, ORANGE),
                           ('LEFTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 8),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 8), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
    return t


def contenu():
    s = []
    s.append(P('Guide professeur', titre))
    s.append(P("Match Manager EPS : application de gestion de tournois EPS (version %s)" % VERSION, sous))
    ligne = Table([['']], colWidths=[170 * mm], rowHeights=[2])
    ligne.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 1.5, TEAL)]))
    s += [ligne, Spacer(1, 4)]

    s.append(P('Présentation', h2))
    s.append(P("Match Manager EPS est une application de gestion de tournois pour les cours d'EPS "
               "(collège/lycée/AS) : poules, poules + finales, ou tableau à élimination directe (avec consolante), "
               "avec classement automatique. Elle couvre tout sport joué en <b>match au score</b> (raquette/filet : "
               "tennis de table, badminton, volley...) ou en <b>match au temps</b> (foot, hand, rugby, basket...) "
               "avec chronomètre intégré."))
    s.append(P("L'application fonctionne <b>entièrement hors connexion</b> : aucun accès internet n'est nécessaire "
               "pendant le cours. Les données restent uniquement sur l'appareil utilisé."))

    s.append(P('Lancement', h2))
    s.append(P("Match Manager EPS est une application web (PWA) accessible sur <b>outils-eps.fr</b> sans passer par un "
               "store d'applications, ou une application Android (APK) :"))
    s.append(B("<b>Tablette ou smartphone Android</b> : ouvrez le lien avec Chrome, puis le menu (les trois points en "
               "haut à droite), puis « Ajouter à l'écran d'accueil » (ou « Installer l'application »)."))
    s.append(B("<b>iPhone / iPad</b> : ouvrez le lien avec Safari (obligatoire), appuyez sur le bouton Partager, puis "
               "« Sur l'écran d'accueil »."))
    s.append(B("<b>Ordinateur (PC/Mac)</b> : n'importe quel navigateur, pour préparer un tournoi ou faire un test rapide."))
    s.append(B("<b>APK Android</b> : téléchargez le fichier puis ouvrez-le depuis vos téléchargements (autorisez "
               "« Installer des applications inconnues » pour votre navigateur si demandé, uniquement pour cette "
               "installation). Depuis la version 1.9.1, une nouvelle APK s'installe par-dessus la précédente sans "
               "perdre les tournois. Pour une APK plus ancienne, <b>exportez d'abord vos sauvegardes</b> (voir plus "
               "bas) puis désinstallez-la."))
    s.append(P("Une fois lancée, l'application fonctionne sans connexion, écran maintenu allumé pendant la saisie, "
               "plein écran automatique. Le numéro de version s'affiche sous le titre de l'accueil. Un mode clair "
               "(Paramètres, carte Affichage) est disponible ; l'application est sombre par défaut."))

    s.append(P('Modes de tournoi', h2))
    s.append(B("<b>Poules de niveau</b> : poules indépendantes, classement propre à chacune."))
    s.append(B("<b>Poules + tableau final</b> : phase de poules puis finales croisées (les 1ers s'affrontent, les 2es, "
               "etc.) avec classement final. Chaque poule n'envoie en finale que ses qualifiés ; les autres figurent "
               "dans le bloc « Hors finales » du classement."))
    s.append(B("<b>Tableau à élimination directe</b> : bracket avec têtes de série, petite finale et tableaux de "
               "consolantes pour les éliminés."))

    s.append(P('Formats de match', h2))
    s.append(B("<b>Match au score</b> (tennis de table, badminton, volley...) : 1 set décisif ou 2 manches gagnantes "
               "sur 3 (le 3e set n'apparaît qu'en cas d'égalité 1-1), et nombre de points par manche (11, 15, 21 ou "
               "25). Pas de match nul : les scores égaux sont refusés."))
    s.append(B("<b>Match au temps</b> (foot, hand, rugby, basket...) : nombre de périodes (1 à 4) et durée, avec "
               "chronomètre actif par match : démarrage/pause, passage à la période suivante, sonnerie en fin de "
               "temps. Match nul autorisé, sauf en tableau à élimination."))

    s.append(P("Déroulement d'un tournoi", h2))
    s.append(B("<b>Nouveau tournoi</b> : nom, classe, date, mode et format de match."))
    s.append(B("<b>Joueurs</b> : inscription manuelle, par liste collée, ou import CSV (NOM;Niveau), niveaux de 0 à 5. "
               "Les listes peuvent être sauvegardées et réutilisées."))
    s.append(B("<b>Poules / répartition</b> : par niveau (serpentin en mode poules + finales), aléatoire ou manuelle."))
    s.append(B("<b>Matchs</b> : générés automatiquement (round-robin), arbitre attribuable à chaque match, bonus "
               "arbitre configurable. Chaque joueur porte une pastille colorée à l'initiale, de la couleur de sa poule."))
    s.append(B("<b>Classements / finales / tableau</b> : classement en continu (points, confrontation directe, "
               "différence, points marqués), puis finales ou progression du tableau selon le mode."))
    s.append(P("Toute la progression est sauvegardée automatiquement (aucune perte en cas de sortie accidentelle, de "
               "mise en veille ou de rotation)."))

    s.append(P('Pendant le tournoi', h2))
    s.append(B("<b>File d'attente</b> : au-dessus des matchs, elle indique les tables libres, le prochain match "
               "possible (joueurs ni en jeu ni arbitres), la table et l'arbitre suggérés, et un bouton « Lancer ce "
               "match »."))
    s.append(B("<b>Mode tablette élève</b> (icône téléphone sur un match) : un match en grand avec gros boutons + et -, "
               "le joueur en tête s'affiche en vert, confirmation avant validation, puis match suivant. Utile pour "
               "laisser les élèves saisir le score."))
    s.append(B("<b>Joueurs absents ou forfaits</b> (bouton « Joueurs ») : un joueur absent sort de la poule et ses "
               "matchs sont supprimés ; un forfait reste classé en dernier, ses matchs joués sont conservés et, en "
               "tableau, l'adversaire est qualifié. Un joueur peut aussi être ajouté en retard."))
    s.append(B("<b>Annuler</b> : revient à l'état d'avant la dernière action (8 niveaux par tournoi), y compris après "
               "la génération de finales."))
    s.append(B("<b>Modifier un résultat</b> : si des finales ou des tours suivants en dépendent, ils sont supprimés "
               "après confirmation puis recalculés."))
    s.append(B("<b>Départage</b> : à égalité de points, la confrontation directe s'applique (réglable en "
               "configuration avancée pour les nouveaux tournois)."))

    s.append(P('Fin de tournoi et accueil', h2))
    s.append(B("<b>Médailles</b> : les trois premiers de chaque classement reçoivent une médaille (or, argent, bronze) "
               "dès qu'un match est joué."))
    s.append(B("<b>Podium</b> : à la validation du dernier match, une fenêtre « Tournoi terminé ! » affiche les trois "
               "premiers (une seule fois). Le podium reste affiché en haut de l'écran Classements."))
    s.append(B("<b>Accueil</b> : chaque tournoi indique sa progression (matchs joués sur total) et propose « Reprendre » "
               "ou, une fois terminé, « Voir le podium » (liseré vert)."))
    s.append(B("<b>Sons</b> (Paramètres, désactivés par défaut) : un petit « ding » à chaque résultat validé et une "
               "courte mélodie en fin de tournoi. Le réglage est propre à chaque tablette ; la sonnerie du chronomètre "
               "reste toujours active."))

    s.append(P('Récupération des résultats', h2))
    s.append(B("<b>Export Excel (XLSX)</b> : à télécharger depuis l'écran Classements. Onglet Matchs (poules, finales, "
               "tableau) et onglet Classement final. En 2 manches gagnantes, le détail des sets et le total de points "
               "de chaque joueur sont inclus. Fichier nommé MatchManagerEPS_Classe_Date.xlsx."))
    s.append(B("<b>Impression / PDF</b> : classements, arbre du tableau (en paysage), matchs et scores, en A4 noir et "
               "blanc. Sur tablette, le gestionnaire d'impression Android s'ouvre : choisissez « Enregistrer au format "
               "PDF »."))
    s.append(B("<b>Palmarès par classe</b> (accueil) : cumul des tournois d'une classe par joueur (victoires, podiums), "
               "tournois décochables, impression / PDF. Les joueurs sont rapprochés par leur nom."))
    s.append(B("<b>QR code</b> : à scanner avec le téléphone du professeur. L'application Scan EPS "
               "(outils-eps.fr/scan-eps) permet de rassembler les scores et classements dans un même tableau "
               "récapitulatif."))

    s.append(P('Sauvegarde et transfert entre tablettes', h2))
    s.append(P("Depuis l'accueil, « Sauvegarde / transfert » permet d'exporter un tournoi ou tous les tournois (fichier "
               "JSON, ou texte à copier/coller par messagerie) et de les importer sur une autre tablette. Un tournoi "
               "importé qui existe déjà est ajouté en copie. Faites une sauvegarde avant de désinstaller l'application "
               "ou de réinitialiser les données."))

    s.append(P('Accès professeur : configuration avancée', h2))
    s.append(P("L'icône de réglages ouvre les Paramètres (mode clair/sombre, sons, aide), sans mot de passe. La "
               "<b>Configuration avancée</b>, protégée par mot de passe, permet d'adapter l'application au sport et "
               "au niveau de la classe :"))
    s.append(B("Format de match par défaut pour les nouveaux tournois (manches et points, ou périodes et durée)."))
    s.append(B("Système de points de classement (victoire, défaite en manche décisive, défaite, match nul) et "
               "départage par confrontation directe."))
    s.append(B("Bonus arbitre (activation et nombre de points)."))
    s.append(B("Mot de passe personnalisé et réinitialisation des données de l'application."))
    s += [Spacer(1, 4), mot_de_passe(), Spacer(1, 6)]
    s.append(P("<b>Attention</b> : ce mot de passe est volontairement distribué uniquement via ce guide (et non affiché "
               "sur la page de téléchargement du site) pour éviter qu'un élève ne le retrouve en tapant « Match "
               "Manager EPS mot de passe » dans un moteur de recherche. <font color='#C62828'><b>Ne le communiquez "
               "pas aux élèves</b></font> : il ne protège pas des données sensibles, mais évite que les réglages "
               "soient modifiés par mégarde ou par curiosité pendant une séance.", note))
    s.append(P("En cas d'oubli, 3 tentatives incorrectes sur l'écran de connexion font apparaître un bouton pour "
               "réinitialiser au mot de passe par défaut (<font name='FM'>ADMINPROF</font>) ; vous pourrez ensuite "
               "en définir un nouveau. Une fois personnalisé, le mot de passe par défaut ne fonctionne plus.", note))
    s.append(Spacer(1, 8))
    s.append(P("Match Manager EPS, application développée par <b>Nathalie Prenois</b>, professeure EPS (Antibes), "
               "<b>https://outils-eps.fr</b>",
               ParagraphStyle('fin', parent=note, alignment=1, textColor=GRIS)))
    return s


doc = BaseDocTemplate(SORTIE, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm,
                      bottomMargin=18 * mm, title='Guide professeur - Match Manager EPS',
                      author='Nathalie Prenois', subject='Match Manager EPS version %s' % VERSION)
cadre = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate(id='p', frames=[cadre], onPage=en_tete)])
doc.build(contenu())
print('OK', SORTIE, 'version', VERSION)
