import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, ShoppingBag, ArrowRight, X } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { formatPrice, Product } from '@/data/products';
import { toast } from '@/hooks/use-toast';
import { getProductImage } from '@/lib/utils';
import { useDocumentTitle } from '@/lib/utils';

const Wishlist = () => {
  useDocumentTitle('My Wishlist | SWITCH');
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  const openVariantSelector = (product: Product) => {
    setSelectedProduct(product);
    setSelectedSize(product.sizes?.[0] || '');
    setSelectedColor(product.colors?.[0] || product.variants?.[0]?.color || '');
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedSize || !selectedColor) return;
    addToCart(selectedProduct, selectedSize, selectedColor);
    toast({
      title: 'Added to cart',
      description: `${selectedProduct.name} has been added to your cart.`,
    });
    setSelectedProduct(null);
  };

  const handleRemove = (productId: string, productName: string) => {
    removeFromWishlist(productId);
    toast({
      title: 'Removed from wishlist',
      description: `${productName} has been removed.`,
    });
  };

  if (items.length === 0) {
    return (
        <div className="container-custom py-24 text-center min-h-[60vh] flex flex-col items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }} 
            className="max-w-md mx-auto"
          >
            <Heart size={56} className="mx-auto mb-8 stroke-[1] text-foreground/30" />
            <h1 className="text-2xl md:text-3xl font-light tracking-wide mb-4">Awaiting your selection.</h1>
            <p className="text-muted-foreground/80 mb-10 max-w-[18rem] mx-auto text-sm leading-relaxed">
              Curate your personal collection of premium modular essentials.
            </p>
            <Link to="/shop" className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-[10px] group">
              Explore Collection
              <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
    );
  }

  return (
    <>
      <div className="container-custom py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">My Wishlist</h1>
            <p className="text-muted-foreground">
              {items.length} item{items.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <button
            onClick={() => {
              clearWishlist();
              toast({
                title: 'Wishlist cleared',
                description: 'All items have been removed from your wishlist.',
              });
            }}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative"
            >
              <Link to={`/product/${product.id}`} className="block">
                <div className="relative aspect-product overflow-hidden bg-muted mb-4">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(product.id, product.name);
                    }}
                    className="absolute top-3 right-3 p-2 bg-background/90 backdrop-blur-sm rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.isNew && (
                      <span className="badge-new">New</span>
                    )}
                    {product.discount && product.discount > 0 && (
                      <span className="badge-sale">-{product.discount}%</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium line-clamp-1">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatPrice(product.price)}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {/* Add to Cart Button */}
              <button
                onClick={() => openVariantSelector(product)}
                className="w-full mt-3 py-2 border border-foreground text-foreground text-xs uppercase tracking-widest font-medium flex items-center justify-center gap-2 hover:bg-foreground hover:text-background transition-colors"
              >
                <ShoppingBag size={14} />
                Add to Cart
              </button>
            </motion.div>
          ))}
        </div>

        {/* Continue Shopping */}
        <div className="text-center mt-12">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 btn-outline"
          >
            Continue Shopping
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Variant Selector Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md bg-background rounded-2xl border border-border z-50 overflow-y-auto max-h-[80vh]"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Select Options</h3>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="w-20 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img loading="lazy" decoding="async"
                      src={getProductImage(selectedProduct)}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-lg font-bold mt-1">{formatPrice(selectedProduct.price)}</p>
                  </div>
                </div>

                {/* Size Selection */}
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-sm font-medium mb-2">Size: <span className="text-muted-foreground">{selectedSize}</span></h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[44px] h-10 px-3 rounded-lg border text-sm font-medium transition-all ${
                            selectedSize === size
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Selection */}
                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2">Color: <span className="text-muted-foreground">{selectedColor}</span></h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            selectedColor === color
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleAddToCart}
                  className="w-full py-3 bg-foreground text-background text-sm uppercase tracking-widest font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <ShoppingBag size={16} />
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Wishlist;
