type MaterialProps = {
  material: {
    id: string;
    type: string;
    url: string;
    title: string | null;
  };
};

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube-nocookie.com/embed/${match[1]}`;
  }
  return null;
}

export function MaterialEmbed({ material }: MaterialProps) {
  const { type, url, title } = material;

  if (type === "AUDIO_URL") {
    return (
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <audio src={url} controls className="w-full" />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          ↗
        </a>
      </div>
    );
  }

  if (type === "VIDEO_URL") {
    const youtubeEmbed = getYouTubeEmbedUrl(url);
    if (youtubeEmbed) {
      return (
        <div className="space-y-1">
          {title && <p className="text-sm font-medium">{title}</p>}
          <iframe
            src={youtubeEmbed}
            className="aspect-video w-full rounded-md"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <video src={url} controls className="w-full rounded-md" />
      </div>
    );
  }

  if (type === "IFRAME_EMBED") {
    const isQuranKsu = url.includes("quran.ksu.edu.sa");
    return (
      <div className="space-y-1">
        {title && <p className="text-sm font-medium">{title}</p>}
        <iframe
          src={url}
          className={`w-full rounded-md ${isQuranKsu ? "h-[600px]" : "h-[400px]"}`}
          sandbox="allow-scripts allow-same-origin allow-popups"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div>
      {title && <span className="text-sm font-medium">{title}: </span>}
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
        {url}
      </a>
    </div>
  );
}
