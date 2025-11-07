// frontend/src/components/DropdownMenu.js
// Reusable 3-dot dropdown menu with portal rendering

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './DropdownMenu.css';

const DropdownMenu = ({ items, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Calculate menu position based on trigger button
  const updateMenuPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 160; // Match min-width in CSS
      
      // Position menu to the left of the trigger, aligned with top
      setMenuPosition({
        top: rect.top,
        left: rect.left - menuWidth + rect.width, // Right-align with trigger
      });
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updateMenuPosition, true); // Listen to all scroll events
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleItemClick = (action) => {
    setIsOpen(false);
    onSelect(action);
  };

  const dropdownMenu = isOpen ? (
    <div
      ref={menuRef}
      className="dropdown-menu-portal"
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        zIndex: 10000,
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`dropdown-item ${item.className || ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            if (item.onClick && !item.disabled) {
              item.onClick();
            }
          }}
          disabled={item.disabled}
          title={item.tooltip}
        >
          {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        className="dropdown-trigger"
        onClick={handleToggle}
        title="More options"
      >
        ⋮
      </button>
      {dropdownMenu && createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default DropdownMenu;
