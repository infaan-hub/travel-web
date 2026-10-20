from pathlib import Path

path = Path("D:/travel-web/next-app/src/features/pages/TourDetailPage.tsx")
text = path.read_text(encoding="utf-8")

if "translations" not in text:
    text = text.replace(
        "  const [tourReviews, setTourReviews] = useState([]);",
        """  const [tourReviews, setTourReviews] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [locale, setLocale] = useState('en');""",
    )

    text = text.replace(
        """    Promise.all([
      toursAPI.getById(id),
      reviewsAPI.getTourReviews(id),
    ]).then(([tourRes, revRes]) => {""",
        """    Promise.all([
      toursAPI.getById(id),
      reviewsAPI.getTourReviews(id),
      api.get(`/tours/${id}/translations/`).catch(() => ({ data: { translations: [] } })),
    ]).then(([tourRes, revRes, translationRes]) => {
      setTranslations(translationRes.data?.translations || []);""",
    )

    # Language switcher + translated copy.
    text = text.replace(
        """  const handleBookNow = () => {""",
        """  const activeTranslation = translations.find((item) => item.locale === locale);
  const displayTitle = activeTranslation?.title || tour?.title;
  const displayDescription = activeTranslation?.description || tour?.description;
  const displayShortDescription = activeTranslation?.short_description || tour?.short_description;

  const handleBookNow = () => {""",
    )

    path.write_text(text, encoding="utf-8")
print("TourDetailPage translation state added")
