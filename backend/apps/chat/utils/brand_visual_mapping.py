"""
🎨 Brand Visual Characteristics Mapping

Замість вказування назви бренду (що призводить до неправильних логотипів),
використовуємо візуальні характеристики дизайну кожного бренду.

AI генерує автомобіль по СТИЛЮ, а не по БРЕНДУ.
"""

# Візуальні характеристики автомобільних брендів
AUTOMOTIVE_BRAND_CHARACTERISTICS = {
    # === НІМЕЦЬКІ БРЕНДИ ===
    "BMW": {
        "style": "German sporty luxury",
        "grille_style": "dual kidney-shaped openings (NO logo shown)",
        "headlights": "angel eyes LED rings, sharp angular design",
        "body_language": "athletic stance with sculpted surfaces and character lines",
        "design_era": "contemporary German performance design",
        "proportions": "long hood, short overhangs, dynamic profile"
    },
    "Mercedes-Benz": {
        "style": "German executive luxury",
        "grille_style": "large upright grille with horizontal slats (NO logo shown)",
        "headlights": "sleek LED units with integrated DRL strips",
        "body_language": "elegant flowing lines with upright grille",
        "design_era": "modern German prestige design",
        "proportions": "balanced proportions, premium stance"
    },
    "Audi": {
        "style": "German technical luxury",
        "grille_style": "wide hexagonal single-frame grille (NO logo shown)",
        "headlights": "sharp LED matrix with distinctive light signature",
        "body_language": "clean geometric lines, technical precision",
        "design_era": "contemporary German technical design",
        "proportions": "wide stance, quattro athletic profile"
    },
    "Volkswagen": {
        "style": "German mainstream practical",
        "grille_style": "clean horizontal bar grille (NO logo shown)",
        "headlights": "simple modern LED design",
        "body_language": "functional clean design with subtle curves",
        "design_era": "modern German everyday design",
        "proportions": "compact efficient packaging"
    },
    "Porsche": {
        "style": "German sports performance",
        "grille_style": "low sporty air intakes (NO logo shown)",
        "headlights": "four-point LED lights, iconic shape",
        "body_language": "muscular haunches, low wide stance",
        "design_era": "timeless German sports car design",
        "proportions": "rear-engine proportions, sports car stance"
    },
    
    # === ЯПОНСЬКІ БРЕНДИ ===
    "Toyota": {
        "style": "Japanese reliable mainstream",
        "grille_style": "large trapezoid mesh grille (NO logo shown)",
        "headlights": "angular aggressive LED units",
        "body_language": "sharp angular lines, modern dynamic",
        "design_era": "contemporary Japanese mainstream",
        "proportions": "balanced practical proportions"
    },
    "Honda": {
        "style": "Japanese sporty practical",
        "grille_style": "wing-shaped horizontal grille (NO logo shown)",
        "headlights": "sharp swept-back LED design",
        "body_language": "dynamic lines with sporty character",
        "design_era": "modern Japanese performance-oriented",
        "proportions": "low center of gravity, athletic stance"
    },
    "Nissan": {
        "style": "Japanese bold modern",
        "grille_style": "V-motion angular grille (NO logo shown)",
        "headlights": "boomerang-shaped LED lights",
        "body_language": "bold angular surfaces, muscular lines",
        "design_era": "contemporary Japanese aggressive",
        "proportions": "wide assertive stance"
    },
    "Mazda": {
        "style": "Japanese elegant motion",
        "grille_style": "pentagonal grille with horizontal bars (NO logo shown)",
        "headlights": "narrow sleek LED design",
        "body_language": "flowing Kodo design language, sculpted surfaces",
        "design_era": "modern Japanese elegant",
        "proportions": "long hood, cab-rearward proportions"
    },
    "Lexus": {
        "style": "Japanese premium luxury",
        "grille_style": "spindle grille with mesh pattern (NO logo shown)",
        "headlights": "L-shaped LED signature, sharp angles",
        "body_language": "dramatic angular surfaces, premium presence",
        "design_era": "contemporary Japanese luxury",
        "proportions": "premium stance, bold presence"
    },
    
    # === ФРАНЦУЗЬКІ БРЕНДИ ===
    "Renault": {
        "style": "French modern European",
        "grille_style": "wide horizontal slats with central bar (NO logo shown)",
        "headlights": "C-shaped swept-back LED lights",
        "body_language": "flowing curves with sharp creases",
        "design_era": "modern French design",
        "proportions": "compact European proportions"
    },
    "Peugeot": {
        "style": "French elegant sporty",
        "grille_style": "frameless vertical bars grille (NO logo shown)",
        "headlights": "fang-shaped LED with three-claw signature",
        "body_language": "elegant muscular lines, sculpted bonnet",
        "design_era": "contemporary French premium",
        "proportions": "coupe-like stance, dynamic profile"
    },
    "Citroën": {
        "style": "French innovative comfort",
        "grille_style": "split horizontal grille (NO logo shown)",
        "headlights": "unique LED signature, distinctive shape",
        "body_language": "soft organic shapes, comfort-oriented",
        "design_era": "modern French innovative",
        "proportions": "comfortable upright stance"
    },
    
    # === АМЕРИКАНСЬКІ БРЕНДИ ===
    "Ford": {
        "style": "American bold practical",
        "grille_style": "hexagonal mesh grille (NO logo shown)",
        "headlights": "horizontal LED bars",
        "body_language": "muscular proportions, bold character",
        "design_era": "modern American mainstream",
        "proportions": "strong truck-inspired presence"
    },
    "Chevrolet": {
        "style": "American mainstream sporty",
        "grille_style": "dual horizontal bar grille (NO logo shown)",
        "headlights": "sharp angular LED design",
        "body_language": "sporty aggressive lines",
        "design_era": "contemporary American performance",
        "proportions": "wide aggressive stance"
    },
    "Tesla": {
        "style": "American minimalist tech",
        "grille_style": "smooth body-colored nose (NO grille, NO logo shown)",
        "headlights": "slim LED strips, minimalist design",
        "body_language": "clean aerodynamic surfaces, tech-forward",
        "design_era": "futuristic electric design",
        "proportions": "aerodynamic efficient profile"
    },
    "Dodge": {
        "style": "American muscle performance",
        "grille_style": "split aggressive grille (NO logo shown)",
        "headlights": "narrow aggressive LED units",
        "body_language": "muscular wide body, performance stance",
        "design_era": "modern American muscle",
        "proportions": "wide aggressive proportions"
    },
    
    # === КОРЕЙСЬКІ БРЕНДИ ===
    "Hyundai": {
        "style": "Korean modern progressive",
        "grille_style": "cascading horizontal bars grille (NO logo shown)",
        "headlights": "split LED design with DRL strip",
        "body_language": "flowing sensuous surfaces",
        "design_era": "contemporary Korean premium",
        "proportions": "balanced elegant proportions"
    },
    "Kia": {
        "style": "Korean bold dynamic",
        "grille_style": "tiger nose wide grille (NO logo shown)",
        "headlights": "ice cube LED design, sharp angles",
        "body_language": "dynamic bold lines, sporty character",
        "design_era": "modern Korean sporty",
        "proportions": "wide assertive stance"
    },
    
    # === КИТАЙСЬКІ БРЕНДИ ===
    "BYD": {
        "style": "Chinese modern electric",
        "grille_style": "smooth closed front panel (NO logo shown)",
        "headlights": "full-width LED bar design",
        "body_language": "clean modern surfaces, tech-oriented",
        "design_era": "contemporary Chinese electric",
        "proportions": "modern efficient proportions"
    },
    "Geely": {
        "style": "Chinese mainstream modern",
        "grille_style": "expanding cosmos grille pattern (NO logo shown)",
        "headlights": "modern LED units",
        "body_language": "balanced modern design",
        "design_era": "contemporary Chinese mainstream",
        "proportions": "practical modern proportions"
    },
    "Great Wall": {
        "style": "Chinese SUV-focused",
        "grille_style": "large hexagonal grille (NO logo shown)",
        "headlights": "modern LED design",
        "body_language": "rugged SUV character, bold lines",
        "design_era": "contemporary Chinese SUV",
        "proportions": "tall rugged stance"
    },
    "Haval": {
        "style": "Chinese premium SUV",
        "grille_style": "honeycomb mesh grille (NO logo shown)",
        "headlights": "split-level LED design",
        "body_language": "premium SUV presence, sculpted surfaces",
        "design_era": "modern Chinese premium",
        "proportions": "luxury SUV proportions"
    },
    
    # === ІТАЛІЙСЬКІ БРЕНДИ ===
    "Fiat": {
        "style": "Italian compact stylish",
        "grille_style": "rounded retro-inspired grille (NO logo shown)",
        "headlights": "round friendly LED design",
        "body_language": "cute compact proportions, Italian flair",
        "design_era": "modern Italian city car",
        "proportions": "compact urban proportions"
    },
    "Alfa Romeo": {
        "style": "Italian sporty elegant",
        "grille_style": "triangular shield grille (NO logo shown)",
        "headlights": "three-element LED design",
        "body_language": "passionate flowing lines, sporty elegance",
        "design_era": "contemporary Italian sports luxury",
        "proportions": "sporty coupe-like stance"
    },
    
    # === ІНШІ ЄВРОПЕЙСЬКІ ===
    "Volvo": {
        "style": "Swedish safe premium",
        "grille_style": "concave diagonal iron mark grille (NO logo shown)",
        "headlights": "Thor's hammer LED signature",
        "body_language": "strong safe presence, Scandinavian elegance",
        "design_era": "modern Swedish premium safety",
        "proportions": "strong upright stance"
    },
    "Škoda": {
        "style": "Czech practical modern",
        "grille_style": "wide horizontal bars grille (NO logo shown)",
        "headlights": "split LED design with sharp angles",
        "body_language": "clean functional design, practical elegance",
        "design_era": "contemporary European practical",
        "proportions": "spacious efficient proportions"
    },
    "Dacia": {
        "style": "Romanian value practical",
        "grille_style": "simple horizontal bars grille (NO logo shown)",
        "headlights": "Y-shaped LED signature",
        "body_language": "functional no-nonsense design",
        "design_era": "modern European budget",
        "proportions": "practical efficient proportions"
    },
    
    # === РОСІЙСЬКІ ===
    "Lada": {
        "style": "Russian practical rugged",
        "grille_style": "simple horizontal grille (NO logo shown)",
        "headlights": "basic modern LED units",
        "body_language": "functional robust design",
        "design_era": "contemporary Russian utilitarian",
        "proportions": "high ground clearance, rugged stance"
    },
}

# Візуальні характеристики спецтехніки
SPECIAL_EQUIPMENT_CHARACTERISTICS = {
    "Caterpillar": {
        "style": "Industrial construction",
        "color_scheme": "signature yellow industrial finish",
        "design": "heavy-duty construction equipment with robust frame",
        "features": "hydraulic boom and bucket attachments",
        "proportions": "tracked undercarriage with rotating cab",
        "branding_note": "NO CAT logo, NO Caterpillar text, clean unmarked equipment"
    },
    "Atlas": {
        "style": "German construction precision",
        "color_scheme": "industrial yellow/orange finish",
        "design": "hydraulic excavator with compact design",
        "features": "articulated boom arm with bucket",
        "proportions": "tracked base with rotating upper structure",
        "branding_note": "NO Atlas logo, NO brand markings, generic excavator"
    },
    "Komatsu": {
        "style": "Japanese construction efficiency",
        "color_scheme": "industrial yellow with dark accents",
        "design": "modern construction equipment with efficient layout",
        "features": "hydraulic systems and attachment points",
        "proportions": "balanced construction equipment stance",
        "branding_note": "NO Komatsu logo, NO brand text, unmarked equipment"
    },
    "JCB": {
        "style": "British construction innovation",
        "color_scheme": "signature yellow industrial paint",
        "design": "backhoe loader or excavator configuration",
        "features": "front bucket and rear excavator arm",
        "proportions": "four-wheeled or tracked base",
        "branding_note": "NO JCB logo, NO brand markings, clean equipment"
    },
    "Hitachi": {
        "style": "Japanese construction technology",
        "color_scheme": "industrial orange/yellow finish",
        "design": "advanced hydraulic excavator",
        "features": "precise hydraulic controls and attachments",
        "proportions": "tracked undercarriage with spacious cab",
        "branding_note": "NO Hitachi logo, NO brand text, generic construction equipment"
    },
}

# Загальні характеристики для невідомих брендів
GENERIC_CHARACTERISTICS = {
    "car": {
        "style": "modern automotive design",
        "grille_style": "contemporary horizontal grille (NO logos shown)",
        "headlights": "modern LED headlight design",
        "body_language": "balanced proportions with clean lines",
        "design_era": "contemporary automotive",
        "proportions": "standard passenger car stance"
    },
    "suv": {
        "style": "modern SUV design",
        "grille_style": "bold upright grille (NO logos shown)",
        "headlights": "commanding LED headlight design",
        "body_language": "tall rugged proportions with ground clearance",
        "design_era": "contemporary SUV",
        "proportions": "elevated ride height, robust stance"
    },
    "truck": {
        "style": "commercial truck design",
        "grille_style": "large industrial grille (NO logos shown)",
        "headlights": "functional LED lighting",
        "body_language": "heavy-duty proportions with commercial character",
        "design_era": "modern commercial vehicle",
        "proportions": "tall cabin with cargo area"
    },
    "special": {
        "style": "industrial construction equipment",
        "color_scheme": "industrial yellow/orange finish",
        "design": "heavy-duty construction machinery",
        "features": "hydraulic systems and attachments",
        "proportions": "construction equipment configuration",
        "branding_note": "NO logos, NO brand markings, generic equipment"
    }
}


def get_brand_visual_description(brand: str, vehicle_type: str = "car", body_type: str = "") -> dict:
    """
    Повертає візуальні характеристики бренду замість назви бренду.
    
    Args:
        brand: Назва бренду (напр. "Renault", "Toyota")
        vehicle_type: Тип транспорту ("car", "truck", "special")
        body_type: Тип кузову ("sedan", "suv", "hatchback")
    
    Returns:
        dict: Візуальні характеристики для промпту
    """
    brand_clean = (brand or "").strip()
    
    # Спецтехніка
    if vehicle_type == "special":
        if brand_clean in SPECIAL_EQUIPMENT_CHARACTERISTICS:
            return SPECIAL_EQUIPMENT_CHARACTERISTICS[brand_clean]
        return GENERIC_CHARACTERISTICS["special"]
    
    # Автомобілі
    if brand_clean in AUTOMOTIVE_BRAND_CHARACTERISTICS:
        return AUTOMOTIVE_BRAND_CHARACTERISTICS[brand_clean]
    
    # Fallback на загальні характеристики
    if "suv" in body_type.lower() or "crossover" in body_type.lower():
        return GENERIC_CHARACTERISTICS["suv"]
    elif "truck" in vehicle_type.lower() or "вантаж" in vehicle_type.lower():
        return GENERIC_CHARACTERISTICS["truck"]
    else:
        return GENERIC_CHARACTERISTICS["car"]


def create_brand_agnostic_prompt(brand: str, model: str, year: int, color: str, 
                                  vehicle_type: str, body_type: str, angle: str) -> str:
    """
    Створює промпт БЕЗ вказування назви бренду, використовуючи візуальні характеристики.
    
    Це вирішує проблему неправильних логотипів.
    """
    characteristics = get_brand_visual_description(brand, vehicle_type, body_type)
    
    # Базовий опис без бренду
    base_description = f"""
    A {year} {characteristics.get('style', 'modern automotive design')} {body_type} vehicle,
    {color} exterior paint finish,
    featuring {characteristics.get('headlights', 'modern LED headlights')},
    {characteristics.get('grille_style', 'contemporary grille design')},
    {characteristics.get('body_language', 'balanced proportions')},
    {characteristics.get('proportions', 'standard automotive stance')}
    """.strip()
    
    # Додаємо ракурс
    angle_descriptions = {
        "front": "front view, centered composition, showing front fascia and headlights",
        "side": "side profile view, complete vehicle silhouette visible",
        "rear": "rear view, showing taillights and rear design",
        "interior": "interior cabin view, dashboard and steering wheel visible"
    }
    
    angle_detail = angle_descriptions.get(angle, "automotive photography angle")
    
    # КРИТИЧНО: Заборона логотипів
    logo_prevention = """
    CRITICAL: CLEAN UNMARKED FRONT GRILLE - absolutely no brand logos, no emblems, 
    no badges, no manufacturer text, no symbols visible anywhere on vehicle.
    Smooth blank grille surface, generic automotive design.
    Focus on body shape, design lines, and proportions rather than brand identity.
    """
    
    # Фінальний промпт
    final_prompt = f"""
    {base_description}.
    {angle_detail}.
    {logo_prevention}
    Professional automotive photography, realistic rendering, high quality, 
    clean background, photorealistic lighting and shadows.
    """
    
    return " ".join(final_prompt.split())  # Видаляємо зайві пробіли


def get_generic_vehicle_description(vehicle_type: str, body_type: str) -> str:
    """
    Повертає загальний опис типу транспорту без прив'язки до бренду.
    """
    descriptions = {
        "car": {
            "sedan": "four-door sedan with trunk, balanced proportions",
            "hatchback": "compact hatchback with rear liftgate, sporty profile",
            "coupe": "two-door coupe with sloping roofline, sporty stance",
            "suv": "sport utility vehicle with elevated ride height, rugged proportions",
            "crossover": "crossover utility vehicle, blend of car and SUV design",
            "wagon": "station wagon with extended cargo area, practical design",
            "convertible": "convertible with retractable roof, sporty elegant design"
        },
        "truck": {
            "pickup": "pickup truck with open cargo bed, robust utility design",
            "commercial": "commercial truck with cargo box, industrial design",
            "heavy": "heavy-duty truck with large cargo capacity"
        },
        "special": {
            "excavator": "hydraulic excavator with tracked base and articulated boom",
            "loader": "wheel loader with front bucket, construction equipment",
            "crane": "mobile crane with telescopic boom and outriggers"
        }
    }
    
    vehicle_desc = descriptions.get(vehicle_type, {})
    body_desc = vehicle_desc.get(body_type, f"{vehicle_type} configuration")
    
    return body_desc

