class AvatarUploader < CarrierWave::Uploader::Base
  # Include RMagick or MiniMagick support:
  # include CarrierWave::RMagick
  include CarrierWave::MiniMagick

  # Choose what kind of storage to use for this uploader:
  storage(Rails.env.production? ? :fog : :file)

  # Override the directory where uploaded files will be stored.
  # This is a sensible default for uploaders that are meant to be mounted:
  def store_dir
    "uploads/#{model.class.to_s.underscore}/#{mounted_as}/#{model.id}"
  end

  version :large do
    process resize_to_limit: [800, 800]
  end
 
  version :medium, :from_version => :large do
    process resize_to_limit: [300, 300]
  end
 
  version :thumb, :from_version => :medium do
    process resize_to_fit: [50, 50]
  end

  version :logo do
    process resize_to_fill: [100, 100]
  end
 
  version :square do
    process :resize_to_fill => [500, 500]
  end



  # Provide a default URL as a default if there hasn't been a file uploaded:
  # def default_url(*args)
  #   # For Rails 3.1+ asset pipeline compatibility:
  #   # ActionController::Base.helpers.asset_path("fallback/" + [version_name, "default.png"].compact.join('_'))
  #
  #   "/images/fallback/" + [version_name, "default.png"].compact.join('_')
  # end

  # Process files as they are uploaded:
  # process scale: [200, 300]
  #
  # def scale(width, height)
  #   # do something
  # end

  # Create different versions of your uploaded files:
  # version :thumb do
  #   process resize_to_fit: [50, 50]
  # end

  # Allowlists (CarrierWave 3.x). Los metodos con el nombre viejo (los de la
  # 2.x, con "white" en vez de "allow") ya NO existen en la 3.1.2 instalada:
  # declararlos seria codigo muerto. El avatar es restrictivo a proposito: solo imagenes.
  def extension_allowlist
    %w[jpg jpeg png gif webp]
  end

  def content_type_allowlist
    ["image/jpeg", "image/png", "image/gif", "image/webp"]
  end

  def size_range
    1.byte..5.megabytes
  end

  # Override the filename of the uploaded files:
  # Avoid using model.id or version_name here, see uploader/store.rb for details.
  # def filename
  #   "something.jpg" if original_filename
  # end
end
